from datetime import date, datetime, time

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.core.dependencies import CurrentUser, DatabaseSession, require_roles
from app.models.attendance import Attendance
from app.models.class_model import ClassModel
from app.models.student import Student
from app.schemas.attendance import AttendanceCreate, AttendancePage, AttendanceRead, AttendanceUpdate
from app.services.attendance_service import status_for_check_in

router = APIRouter(prefix="/api/attendance", tags=["វត្តមាន"])


def _attendance_response(record: Attendance) -> AttendanceRead:
    student = record.student
    return AttendanceRead(
        id=record.id,
        student_id=student.id,
        student_code=student.student_code,
        student_name=f"{student.last_name} {student.first_name}",
        class_name=student.classroom.class_name,
        attendance_date=record.attendance_date,
        check_in_time=record.check_in_time,
        check_out_time=record.check_out_time,
        status=record.status,
        confidence=record.confidence,
        created_at=record.created_at,
    )


@router.get("", response_model=AttendancePage)
def list_attendance(
    database: DatabaseSession,
    _: CurrentUser,
    attendance_date: date | None = None,
    class_id: int | None = Query(default=None, gt=0),
    student_id: int | None = Query(default=None, gt=0),
    attendance_status: str | None = Query(default=None, alias="status", pattern="^(present|absent|late)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> AttendancePage:
    conditions = []
    if attendance_date:
        conditions.append(Attendance.attendance_date == attendance_date)
    if class_id is not None:
        conditions.append(Student.class_id == class_id)
    if student_id is not None:
        conditions.append(Attendance.student_id == student_id)
    if attendance_status:
        conditions.append(Attendance.status == attendance_status)

    query = select(Attendance).join(Student).where(*conditions)
    total = database.scalar(select(func.count(Attendance.id)).join(Student).where(*conditions)) or 0
    records = database.scalars(
        query.options(joinedload(Attendance.student).joinedload(Student.classroom))
        .order_by(Attendance.attendance_date.desc(), Attendance.check_in_time.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return AttendancePage(
        items=[_attendance_response(record) for record in records],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
def create_attendance(
    payload: AttendanceCreate,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> AttendanceRead:
    student = database.scalar(
        select(Student)
        .options(joinedload(Student.classroom))
        .where(Student.id == payload.student_id, Student.status == "active")
    )
    if student is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញសិស្សសកម្មនេះទេ។")
    check_in_time = payload.check_in_time
    if payload.status == "absent":
        check_in_time = None
    attendance_status = payload.status
    if attendance_status is None:
        attendance_status = status_for_check_in(check_in_time or datetime.now().time())
    if attendance_status in {"present", "late"} and check_in_time is None:
        check_in_time = datetime.now().time().replace(microsecond=0)
        attendance_status = status_for_check_in(check_in_time)

    record = Attendance(
        student_id=student.id,
        attendance_date=payload.attendance_date,
        check_in_time=check_in_time,
        check_out_time=payload.check_out_time,
        status=attendance_status,
        confidence=payload.confidence,
    )
    database.add(record)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=409, detail="សិស្សនេះមានកំណត់ត្រាវត្តមានរួចហើយក្នុងថ្ងៃនេះ។") from error
    database.refresh(record)
    record.student = student
    return _attendance_response(record)


@router.put("/{attendance_id}", response_model=AttendanceRead)
def update_attendance(
    attendance_id: int,
    payload: AttendanceUpdate,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> AttendanceRead:
    record = database.scalar(
        select(Attendance)
        .options(joinedload(Attendance.student).joinedload(Student.classroom))
        .where(Attendance.id == attendance_id)
    )
    if record is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញកំណត់ត្រាវត្តមាននេះទេ។")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(record, field, value)
    if "check_in_time" in updates and "status" not in updates and record.check_in_time:
        record.status = status_for_check_in(record.check_in_time)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(
            status_code=409,
            detail="ការកែប្តូរនេះប៉ះពាល់កំណត់ត្រាវត្តមានដែលមានរួចហើយសម្រាប់សិស្សនេះក្នុងថ្ងៃនេះ។",
        ) from error
    database.refresh(record)
    return _attendance_response(record)


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(
    attendance_id: int,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> None:
    record = database.get(Attendance, attendance_id)
    if record is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញកំណត់ត្រាវត្តមាននេះទេ។")
    database.delete(record)
    database.commit()