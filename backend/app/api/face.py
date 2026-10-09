
import logging
from datetime import datetime
from decimal import Decimal
from functools import lru_cache

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.dependencies import (
    CurrentUser,
    DatabaseSession,
    require_roles,
)
from app.models.attendance import Attendance
from app.models.face_encoding import FaceEncoding
from app.models.student import Student
from app.services.attendance_service import (
    AttendanceAlreadyRecorded,
    StudentNotAvailable,
    record_check_in,
)
from app.services.face_service import FaceProcessingError, FaceService


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/face",
    tags=["ការស្គាល់មុខ"],
)


@lru_cache(maxsize=1)
def get_face_service() -> FaceService:
    """បង្កើត FaceService មួយ ហើយប្រើឡើងវិញ។"""
    return FaceService()


async def _read_image(image: UploadFile) -> bytes:
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="សូមប្រើរូបភាព JPEG, PNG ឬ WebP។",
        )

    max_bytes = get_settings().max_upload_bytes
    data = await image.read(max_bytes + 1)

    if not data:
        raise HTTPException(
            status_code=400,
            detail="មិនមានទិន្នន័យរូបភាពទេ។",
        )

    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail="រូបភាពមានទំហំលើសកំណត់។",
        )

    return data


def _process_error(error: FaceProcessingError) -> HTTPException:
    errors = {
        "no_face": (
            422,
            "មិនរកឃើញមុខ។ សូមដាក់មុខនៅកណ្ដាលកាមេរ៉ា។",
        ),
        "multiple_faces": (
            422,
            "រកឃើញមុខច្រើនជាងមួយ។ សូមឱ្យមានមនុស្សម្នាក់ប៉ុណ្ណោះ។",
        ),
        "low_quality": (
            422,
            "មុខមិនច្បាស់។ សូមថតម្ដងទៀត។",
        ),
        "image_too_small": (
            422,
            "រូបភាពតូចពេក។ សូមថតម្ដងទៀត។",
        ),
        "invalid_image": (
            415,
            "រូបភាពមិនត្រឹមត្រូវ។",
        ),
        "models_unavailable": (
            503,
            "ប្រព័ន្ធ Face Detection មិនទាន់អាចប្រើបាន។ សូមពិនិត្យ Model និង OpenCV។",
        ),
        "ambiguous_match": (
            409,
            "លទ្ធផលស្រដៀងគ្នាច្រើន។ សូមស្កេនម្ដងទៀត។",
        ),
    }

    status_code, message = errors.get(
        error.code,
        (422, "មិនអាចដំណើរការការស្គាល់មុខបានទេ។"),
    )

    logger.warning(
        "Face processing failed: code=%s",
        error.code,
    )

    return HTTPException(
        status_code=status_code,
        detail=message,
    )


async def _run_face_operation(operation_name: str, *args):
    """ដំណើរការ FaceService ដោយគាំទ្រអាគុយម៉ង់ច្រើន។"""
    try:
        service = get_face_service()
        operation = getattr(service, operation_name, None)

        if operation is None or not callable(operation):
            logger.error(
                "FaceService operation does not exist: %s",
                operation_name,
            )
            raise HTTPException(
                status_code=500,
                detail="មុខងារ Face Service មិនមានទេ។",
            )

        return await run_in_threadpool(operation, *args)

    except FaceProcessingError as error:
        raise _process_error(error) from error

    except HTTPException:
        raise

    except Exception as error:
        logger.exception(
            "Unexpected face service error in %s",
            operation_name,
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "ប្រព័ន្ធស្គាល់មុខមិនអាចដំណើរការបាន។ "
                "សូមពិនិត្យ Vercel Runtime Logs។"
            ),
        ) from error


@router.post("/register")
async def register_face(
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
    student_id: int = Form(gt=0),
    image: UploadFile = File(...),
) -> dict[str, object]:

    student = database.get(Student, student_id)

    if student is None or student.status != "active":
        raise HTTPException(
            status_code=404,
            detail="រកមិនឃើញសិស្សសកម្មនេះទេ។",
        )

    image_data = await _read_image(image)

    embedding = await _run_face_operation(
        "extract_embedding",
        image_data,
    )

    try:
        database.add(
            FaceEncoding(
                student_id=student_id,
                encoding_data=embedding.tolist(),
            )
        )
        database.commit()

    except Exception as error:
        database.rollback()
        logger.exception(
            "Failed to save face encoding for student_id=%s",
            student_id,
        )
        raise HTTPException(
            status_code=500,
            detail="មិនអាចរក្សាទុកទិន្នន័យមុខបានទេ។",
        ) from error

    return {
        "message": "ចុះឈ្មោះមុខបានជោគជ័យ។",
        "student_id": student_id,
    }


@router.post("/detect")
async def detect_face(
    _: CurrentUser,
    image: UploadFile = File(...),
) -> dict[str, object]:
    """ពិនិត្យមុខសម្រាប់ Auto Scan ដោយមិនកត់ត្រាវត្តមាន។"""

    image_data = await _read_image(image)

    analysis = await _run_face_operation(
        "analyze",
        image_data,
    )

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

    image_data = await _read_image(image)

    embedding = await _run_face_operation(
        "extract_embedding",
        image_data,
    )

    rows = database.execute(
        select(
            FaceEncoding.student_id,
            FaceEncoding.encoding_data,
        )
        .join(
            Student,
            Student.id == FaceEncoding.student_id,
        )
        .where(Student.status == "active")
    ).all()

    known = [
        (student_id, values)
        for student_id, values in rows
    ]

    match = await _run_face_operation(
        "find_match",
        embedding,
        known,
    )

    if match is None:
        raise HTTPException(
            status_code=404,
            detail="មិនស្គាល់សិស្សនេះទេ។",
        )

    similarity = Decimal(
        str(max(0.0, min(1.0, match.similarity)) * 100)
    ).quantize(Decimal("0.01"))

    try:
        record = record_check_in(
            database,
            match.student_id,
            datetime.now(),
            similarity,
        )

    except AttendanceAlreadyRecorded as error:
        raise HTTPException(
            status_code=409,
            detail="សិស្សនេះបានកត់ត្រាវត្តមានរួចហើយ។",
        ) from error

    except StudentNotAvailable as error:
        raise HTTPException(
            status_code=404,
            detail="រកមិនឃើញសិស្សសកម្មនេះទេ។",
        ) from error

    student = database.scalar(
        select(Student)
        .options(joinedload(Student.classroom))
        .where(Student.id == match.student_id)
    )

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="រកមិនឃើញព័ត៌មានសិស្សនេះទេ។",
        )

    return {
        "message": "បានកត់ត្រាវត្តមាន។",
        "student_id": student.id,
        "student_code": student.student_code,
        "student_name": f"{student.last_name} {student.first_name}",
        "class_name": (
            student.classroom.class_name
            if student.classroom is not None
            else None
        ),
        "check_in_time": record.check_in_time,
        "status": record.status,
        "similarity": round(match.similarity, 4),
    }