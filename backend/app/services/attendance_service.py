from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.attendance import Attendance
from app.models.student import Student
from app.schemas.settings import SchoolSettings
from app.utils.helpers import read_json_object


class AttendanceAlreadyRecorded(Exception):
    pass


class StudentNotAvailable(Exception):
    pass


def status_for_check_in(check_in_time: time, late_after_time: time | None = None) -> str:
    cutoff = late_after_time
    if cutoff is None:
        configuration = get_settings()
        try:
            saved = read_json_object(
                configuration.school_settings_file,
                {"late_after_time": configuration.late_after_time.isoformat()},
            )
            cutoff = SchoolSettings.model_validate(saved).late_after_time
        except ValueError:
            cutoff = configuration.late_after_time
    return "late" if check_in_time >= cutoff else "present"


def record_check_in(
    database: Session,
    student_id: int,
    checked_in_at: datetime,
    confidence: Decimal | None,
) -> Attendance:
    student = database.get(Student, student_id)
    if student is None or student.status != "active":
        raise StudentNotAvailable

    attendance_date = checked_in_at.date()
    existing = database.scalar(
        select(Attendance).where(
            Attendance.student_id == student_id,
            Attendance.attendance_date == attendance_date,
        )
    )
    if existing is not None:
        raise AttendanceAlreadyRecorded

    record = Attendance(
        student_id=student_id,
        attendance_date=attendance_date,
        check_in_time=checked_in_at.time().replace(tzinfo=None),
        status=status_for_check_in(checked_in_at.time().replace(tzinfo=None)),
        confidence=confidence,
    )
    database.add(record)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise AttendanceAlreadyRecorded from error
    database.refresh(record)
    return record


def get_day_record(database: Session, student_id: int, attendance_date: date) -> Attendance | None:
    return database.scalar(
        select(Attendance).where(
            Attendance.student_id == student_id,
            Attendance.attendance_date == attendance_date,
        )
    )