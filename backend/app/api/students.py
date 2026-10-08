from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, DatabaseSession, require_roles
from app.models.class_model import ClassModel
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentPage, StudentRead, StudentUpdate
from app.utils.helpers import remove_stored_file, store_image

router = APIRouter(prefix="/api/students", tags=["សិស្ស"])


def _student_response(student: Student) -> StudentRead:
    return StudentRead(
        id=student.id,
        student_code=student.student_code,
        first_name=student.first_name,
        last_name=student.last_name,
        gender=student.gender,
        date_of_birth=student.date_of_birth,
        phone=student.phone,
        email=student.email,
        address=student.address,
        photo=student.photo,
        class_id=student.class_id,
        class_name=student.classroom.class_name,
        status=student.status,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


@router.get("", response_model=StudentPage)
def list_students(
    database: DatabaseSession,
    _: CurrentUser,
    search: str | None = Query(default=None, max_length=100),
    class_id: int | None = Query(default=None, gt=0),
    gender: str | None = Query(default=None, pattern="^(male|female|other)$"),
    student_status: str | None = Query(default=None, alias="status", pattern="^(active|inactive)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> StudentPage:
    conditions = []
    if search:
        pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                Student.student_code.ilike(pattern),
                Student.first_name.ilike(pattern),
                Student.last_name.ilike(pattern),
            )
        )
    if class_id is not None:
        conditions.append(Student.class_id == class_id)
    if gender:
        conditions.append(Student.gender == gender)
    if student_status:
        conditions.append(Student.status == student_status)

    total = database.scalar(select(func.count(Student.id)).where(*conditions)) or 0
    students = database.scalars(
        select(Student)
        .options(joinedload(Student.classroom))
        .where(*conditions)
        .order_by(Student.student_code)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return StudentPage(
        items=[_student_response(student) for student in students],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{student_id}", response_model=StudentRead)
def get_student(student_id: int, database: DatabaseSession, _: CurrentUser) -> StudentRead:
    student = database.scalar(
        select(Student).options(joinedload(Student.classroom)).where(Student.id == student_id)
    )
    if student is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញសិស្សនេះទេ។")
    return _student_response(student)


@router.post("", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> StudentRead:
    if database.get(ClassModel, payload.class_id) is None:
        raise HTTPException(status_code=422, detail="ថ្នាក់ដែលបានជ្រើសមិនមានទេ។")
    student = Student(**payload.model_dump())
    database.add(student)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=409, detail="លេខសម្គាល់ ឬអ៊ីមែលសិស្សមានរួចហើយ។") from error
    database.refresh(student)
    student = database.scalar(
        select(Student).options(joinedload(Student.classroom)).where(Student.id == student.id)
    )
    return _student_response(student)


@router.put("/{student_id}", response_model=StudentRead)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> StudentRead:
    student = database.scalar(
        select(Student).options(joinedload(Student.classroom)).where(Student.id == student_id)
    )
    if student is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញសិស្សនេះទេ។")
    updates = payload.model_dump(exclude_unset=True)
    if "class_id" in updates and database.get(ClassModel, updates["class_id"]) is None:
        raise HTTPException(status_code=422, detail="ថ្នាក់ដែលបានជ្រើសមិនមានទេ។")
    for field, value in updates.items():
        setattr(student, field, value)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=409, detail="លេខសម្គាល់ ឬអ៊ីមែលសិស្សមានរួចហើយ។") from error
    database.refresh(student)
    student = database.scalar(
        select(Student).options(joinedload(Student.classroom)).where(Student.id == student_id)
    )
    return _student_response(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> None:
    student = database.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញសិស្សនេះទេ។")
    photo = student.photo
    database.delete(student)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=409, detail="មិនអាចលុបសិស្សដែលមានប្រវត្តិវត្តមានបានទេ។") from error
    remove_stored_file(get_settings().uploads_directory, photo)


@router.post("/{student_id}/photo", response_model=StudentRead)
async def upload_student_photo(
    student_id: int,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
    image: UploadFile = File(...),
) -> StudentRead:
    student = database.scalar(
        select(Student).options(joinedload(Student.classroom)).where(Student.id == student_id)
    )
    if student is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញសិស្សនេះទេ។")
    settings = get_settings()
    content = await image.read(settings.max_upload_bytes + 1)
    try:
        filename = store_image(
            content,
            image.content_type or "",
            settings.uploads_directory / "students",
            settings.max_upload_bytes,
        )
    except ValueError as error:
        raise HTTPException(status_code=415, detail=str(error)) from error
    previous_photo = student.photo
    student.photo = str(Path("students") / filename)
    database.commit()
    database.refresh(student)
    if previous_photo:
        remove_stored_file(settings.uploads_directory, previous_photo)
    return _student_response(student)


@router.get("/{student_id}/photo")
def get_student_photo(
    student_id: int,
    database: DatabaseSession,
    _: CurrentUser,
) -> FileResponse:
    student = database.get(Student, student_id)
    if student is None or not student.photo:
        raise HTTPException(status_code=404, detail="មិនមានរូបថតសិស្សនេះទេ។")
    root = get_settings().uploads_directory.resolve()
    photo_path = (root / student.photo).resolve()
    if not photo_path.is_relative_to(root) or not photo_path.is_file():
        raise HTTPException(status_code=404, detail="រកមិនឃើញឯកសាររូបថតទេ។")
    return FileResponse(photo_path)