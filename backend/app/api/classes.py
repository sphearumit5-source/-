from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import CurrentUser, DatabaseSession, require_roles
from app.models.class_model import ClassModel
from app.models.student import Student
from app.schemas.class_schema import ClassCreate, ClassRead, ClassUpdate

router = APIRouter(prefix="/api/classes", tags=["ថ្នាក់រៀន"])


def _class_response(database: DatabaseSession, classroom: ClassModel) -> ClassRead:
    count = database.scalar(
        select(func.count(Student.id)).where(Student.class_id == classroom.id)
    ) or 0
    return ClassRead(
        id=classroom.id,
        class_name=classroom.class_name,
        grade=classroom.grade,
        section=classroom.section,
        academic_year=classroom.academic_year,
        student_count=count,
        created_at=classroom.created_at,
    )


@router.get("", response_model=list[ClassRead])
def list_classes(
    database: DatabaseSession,
    _: CurrentUser,
    search: str | None = Query(default=None, max_length=100),
) -> list[ClassRead]:
    query = select(ClassModel).order_by(ClassModel.grade, ClassModel.section)
    if search:
        query = query.where(ClassModel.class_name.ilike(f"%{search.strip()}%"))
    return [_class_response(database, item) for item in database.scalars(query).all()]


@router.post("", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: ClassCreate,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> ClassRead:
    classroom = ClassModel(**payload.model_dump())
    database.add(classroom)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=409, detail="ថ្នាក់នេះមានរួចហើយក្នុងឆ្នាំសិក្សានេះ។") from error
    database.refresh(classroom)
    return _class_response(database, classroom)


@router.put("/{class_id}", response_model=ClassRead)
def update_class(
    class_id: int,
    payload: ClassUpdate,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> ClassRead:
    classroom = database.get(ClassModel, class_id)
    if classroom is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញថ្នាក់នេះទេ។")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(classroom, field, value)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=409, detail="ថ្នាក់នេះមានរួចហើយក្នុងឆ្នាំសិក្សានេះ។") from error
    database.refresh(classroom)
    return _class_response(database, classroom)


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> None:
    classroom = database.get(ClassModel, class_id)
    if classroom is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញថ្នាក់នេះទេ។")
    database.delete(classroom)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=409, detail="សូមផ្ទេរ ឬលុបសិស្សក្នុងថ្នាក់នេះជាមុន។") from error