from datetime import datetime
from decimal import Decimal
from functools import lru_cache

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, DatabaseSession, require_roles
from app.models.attendance import Attendance
from app.models.face_encoding import FaceEncoding
from app.models.student import Student
from app.services.attendance_service import AttendanceAlreadyRecorded, StudentNotAvailable, record_check_in
from app.services.face_service import FaceProcessingError, FaceService

router = APIRouter(prefix="/api/face", tags=["ការស្គាល់មុខ"])


@lru_cache(maxsize=1)
def get_face_service() -> FaceService:
    return FaceService()


async def _read_image(image: UploadFile) -> bytes:
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="សូមប្រើរូបភាព JPEG, PNG ឬ WebP។")
    data = await image.read(get_settings().max_upload_bytes + 1)
    if len(data) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="រូបភាពមានទំហំលើសកំណត់។")
    return data


def _process_error(error: FaceProcessingError) -> HTTPException:
    response = {
        "no_face": (422, "មិនរកឃើញមុខ"),
        "multiple_faces": (422, "រកឃើញមុខច្រើនជាងមួយ"),
        "low_quality": (422, "មុខមិនច្បាស់ សូមថតម្ដងទៀត"),
        "image_too_small": (422, "រូបភាពតូចពេក សូមថតម្ដងទៀត"),
        "invalid_image": (415, "រូបភាពមិនត្រឹមត្រូវ"),
        "models_unavailable": (503, str(error)),
        "ambiguous_match": (409, str(error)),
    }.get(error.code, (422, "មិនអាចដំណើរការការស្គាល់មុខបានទេ។"))
    return HTTPException(status_code=response[0], detail=response[1])


@router.post("/register")
async def register_face(
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
    student_id: int = Form(gt=0),
    image: UploadFile = File(...),
) -> dict[str, object]:
    student = database.get(Student, student_id)
    if student is None or student.status != "active":
        raise HTTPException(status_code=404, detail="រកមិនឃើញសិស្សសកម្មនេះទេ។")
    try:
        embedding = await run_in_threadpool(get_face_service().extract_embedding, await _read_image(image))
    except FaceProcessingError as error:
        raise _process_error(error) from error
    database.add(FaceEncoding(student_id=student_id, encoding_data=embedding.tolist()))
    database.commit()
    return {"message": "ចុះឈ្មោះមុខបានជោគជ័យ។", "student_id": student_id}


@router.post("/detect")
async def detect_face(
    _: CurrentUser,
    image: UploadFile = File(...),
) -> dict[str, object]:
    """Read-only framing analysis for auto-capture guidance. Writes nothing to the database."""
    try:
        analysis = await run_in_threadpool(get_face_service().analyze, await _read_image(image))
    except FaceProcessingError as error:
        raise _process_error(error) from error
    return {
        "face_count": analysis.face_count,
        "ready": analysis.ready,
        "centered": analysis.centered,
        "guidance": analysis.guidance,
    }


@router.post("/recognize")
async def recognize_face(
    database: DatabaseSession,
    _: CurrentUser,
    image: UploadFile = File(...),
) -> dict[str, object]:
    try:
        embedding = await run_in_threadpool(get_face_service().extract_embedding, await _read_image(image))
    except FaceProcessingError as error:
        raise _process_error(error) from error

    rows = database.execute(
        select(FaceEncoding.student_id, FaceEncoding.encoding_data)
        .join(Student, Student.id == FaceEncoding.student_id)
        .where(Student.status == "active")
    ).all()
    known = [(student_id, values) for student_id, values in rows]
    try:
        match = await run_in_threadpool(get_face_service().find_match, embedding, known)
    except FaceProcessingError as error:
        raise _process_error(error) from error
    if match is None:
        raise HTTPException(status_code=404, detail="មិនស្គាល់សិស្សនេះទេ។")

    try:
        record = record_check_in(
            database,
            match.student_id,
            datetime.now(),
            Decimal(str(max(0.0, min(1.0, match.similarity)) * 100)).quantize(Decimal("0.01")),
        )
    except AttendanceAlreadyRecorded as error:
        raise HTTPException(status_code=409, detail="សិស្សនេះបានកត់ត្រាវត្តមានរួចហើយ។") from error
    except StudentNotAvailable as error:
        raise HTTPException(status_code=404, detail="រកមិនឃើញសិស្សសកម្មនេះទេ។") from error

    student = database.scalar(
        select(Student).options(joinedload(Student.classroom)).where(Student.id == match.student_id)
    )
    return {
        "message": "បានកត់ត្រាវត្តមាន។",
        "student_id": student.id,
        "student_code": student.student_code,
        "student_name": f"{student.last_name} {student.first_name}",
        "class_name": student.classroom.class_name,
        "check_in_time": record.check_in_time,
        "status": record.status,
        "similarity": round(match.similarity, 4),
    }