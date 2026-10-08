from datetime import date, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.class_model import ClassModel
from app.models.student import Student


def daily_summary(database: Session, report_date: date, class_id: int | None = None) -> dict[str, int | float]:
    student_query = select(func.count(Student.id)).where(Student.status == "active")
    if class_id is not None:
        student_query = student_query.where(Student.class_id == class_id)
    total_students = database.scalar(student_query) or 0

    attendance_query = (
        select(Attendance.status, func.count(Attendance.id))
        .join(Student, Attendance.student_id == Student.id)
        .where(Attendance.attendance_date == report_date, Student.status == "active")
        .group_by(Attendance.status)
    )
    if class_id is not None:
        attendance_query = attendance_query.where(Student.class_id == class_id)
    recorded = {status: count for status, count in database.execute(attendance_query)}
    present = recorded.get("present", 0)
    late = recorded.get("late", 0)
    absent = max(0, total_students - present - late)
    attendance_rate = round((present + late) * 100 / total_students, 2) if total_students else 0.0
    return {
        "total_students": total_students,
        "present": present,
        "absent": absent,
        "late": late,
        "attendance_rate": attendance_rate,
    }


def class_name_for_student(database: Session, student_id: int) -> str | None:
    return database.scalar(
        select(ClassModel.class_name)
        .join(Student, Student.class_id == ClassModel.id)
        .where(Student.id == student_id)
    )


def report_rows(
    database: Session,
    start_date: date,
    end_date: date,
    class_id: int | None = None,
    student_id: int | None = None,
) -> list[dict[str, object]]:
    report_dates = (start_date + timedelta(days=offset) for offset in range((end_date - start_date).days + 1))
    return [
        row
        for report_date in report_dates
        for row in daily_report_rows(database, report_date, class_id, student_id)
    ]


def daily_report_rows(
    database: Session,
    report_date: date,
    class_id: int | None = None,
    student_id: int | None = None,
) -> list[dict[str, object]]:
    query = (
        select(Student, ClassModel, Attendance)
        .join(ClassModel, Student.class_id == ClassModel.id)
        .outerjoin(
            Attendance,
            and_(Attendance.student_id == Student.id, Attendance.attendance_date == report_date),
        )
        .where(Student.status == "active")
        .order_by(ClassModel.grade, Student.student_code)
    )
    if class_id is not None:
        query = query.where(Student.class_id == class_id)
    if student_id is not None:
        query = query.where(Student.id == student_id)

    rows = []
    for student, classroom, attendance in database.execute(query):
        rows.append({
            "id": attendance.id if attendance is not None else -student.id,
            "student_id": student.id,
            "student_code": student.student_code,
            "student_name": f"{student.last_name} {student.first_name}",
            "class_name": classroom.class_name,
            "attendance_date": report_date,
            "check_in_time": attendance.check_in_time if attendance is not None else None,
            "check_out_time": attendance.check_out_time if attendance is not None else None,
            "status": attendance.status if attendance is not None else "absent",
            "confidence": attendance.confidence if attendance is not None else None,
        })
    return rows