from collections.abc import Iterable, Iterator
from datetime import date, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from app.models.attendance import Attendance
from app.models.class_model import ClassModel
from app.models.student import Student


def _active_student_filters(class_id: int | None = None, student_id: int | None = None) -> list:
    filters = [Student.status == "active"]
    if class_id is not None:
        filters.append(Student.class_id == class_id)
    if student_id is not None:
        filters.append(Student.id == student_id)
    return filters


def _status_count_query(
    start_date: date,
    end_date: date,
    class_id: int | None = None,
    student_id: int | None = None,
) -> Select:
    return (
        select(Attendance.attendance_date, Attendance.status, func.count(Attendance.id))
        .join(Student, Attendance.student_id == Student.id)
        .where(
            *_active_student_filters(class_id, student_id),
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date,
        )
        .group_by(Attendance.attendance_date, Attendance.status)
    )


def _summary(total_students: int, recorded: dict[str, int]) -> dict[str, int | float]:
    present = recorded.get("present", 0)
    late = recorded.get("late", 0)
    return {
        "total_students": total_students,
        "present": present,
        "absent": max(0, total_students - present - late),
        "late": late,
        "attendance_rate": round((present + late) * 100 / total_students, 2) if total_students else 0.0,
    }


def _counts_by_date(rows: Iterable[tuple[date, str, int]]) -> dict[date, dict[str, int]]:
    grouped: dict[date, dict[str, int]] = {}
    for report_date, status, count in rows:
        grouped.setdefault(report_date, {})[status] = count
    return grouped


def daily_summary(database: Session, report_date: date, class_id: int | None = None) -> dict[str, int | float]:
    total_students = database.scalar(
        select(func.count(Student.id)).where(*_active_student_filters(class_id))
    ) or 0
    recorded = _counts_by_date(database.execute(_status_count_query(report_date, report_date, class_id))).get(
        report_date, {}
    )
    return _summary(total_students, recorded)


def summary_by_date(
    database: Session,
    start_date: date,
    end_date: date,
    class_id: int | None = None,
) -> dict[date, dict[str, int | float]]:
    """Per-day summaries for a whole range in two queries instead of two per day."""
    total_students = database.scalar(
        select(func.count(Student.id)).where(*_active_student_filters(class_id))
    ) or 0
    recorded = _counts_by_date(database.execute(_status_count_query(start_date, end_date, class_id)))
    return {
        report_date: _summary(total_students, recorded.get(report_date, {}))
        for report_date in date_range(start_date, end_date)
    }


def date_range(start_date: date, end_date: date) -> list[date]:
    return [
        start_date + timedelta(days=offset)
        for offset in range((end_date - start_date).days + 1)
    ]


def week_bounds(day: date) -> tuple[date, date]:
    """Monday-first week containing ``day``."""
    start_of_week = day - timedelta(days=day.weekday())
    return start_of_week, start_of_week + timedelta(days=6)


def class_name_for_student(database: Session, student_id: int) -> str | None:
    return database.scalar(
        select(ClassModel.class_name)
        .join(Student, Student.class_id == ClassModel.id)
        .where(Student.id == student_id)
    )


def _attendance_counts(
    database: Session,
    start_date: date,
    end_date: date,
    filters: list,
) -> dict[int, int]:
    """Days each student was actually present (or late) inside the range."""
    return {
        student_id: count
        for student_id, count in database.execute(
            select(Attendance.student_id, func.count(Attendance.id))
            .join(Student, Attendance.student_id == Student.id)
            .where(
                *filters,
                Attendance.attendance_date >= start_date,
                Attendance.attendance_date <= end_date,
                Attendance.status != "absent",
            )
            .group_by(Attendance.student_id)
        )
    }


def report_rows(
    database: Session,
    start_date: date,
    end_date: date,
    class_id: int | None = None,
    student_id: int | None = None,
) -> list[dict[str, object]]:
    return list(iter_report_rows(database, start_date, end_date, class_id, student_id))


def iter_report_rows(
    database: Session,
    start_date: date,
    end_date: date,
    class_id: int | None = None,
    student_id: int | None = None,
) -> Iterator[dict[str, object]]:
    """Stream one row per active student per day; three queries for the whole range."""
    filters = _active_student_filters(class_id, student_id)
    roster = list(
        database.execute(
            select(Student, ClassModel)
            .join(ClassModel, Student.class_id == ClassModel.id)
            .where(*filters)
            .order_by(ClassModel.grade, Student.student_code)
        )
    )
    recorded = {
        (attendance.student_id, attendance.attendance_date): attendance
        for attendance in database.scalars(
            select(Attendance)
            .join(Student, Attendance.student_id == Student.id)
            .where(*filters, Attendance.attendance_date >= start_date, Attendance.attendance_date <= end_date)
        )
    }
    counts = _attendance_counts(database, start_date, end_date, filters)

    for report_date in date_range(start_date, end_date):
        for student, classroom in roster:
            yield _report_row(
                student,
                classroom,
                report_date,
                recorded.get((student.id, report_date)),
                counts.get(student.id, 0),
            )


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
        .where(*_active_student_filters(class_id, student_id))
        .order_by(ClassModel.grade, Student.student_code)
    )

    rows = []
    for student, classroom, attendance in database.execute(query):
        attended = 1 if attendance is not None and attendance.status != "absent" else 0
        rows.append(_report_row(student, classroom, report_date, attendance, attended))
    return rows


def student_totals(
    database: Session,
    start_date: date,
    end_date: date,
    class_id: int | None = None,
    student_id: int | None = None,
    pass_attendance_times: int | None = None,
) -> list[dict[str, object]]:
    """One summary row per student: how many days attended out of the range."""
    filters = _active_student_filters(class_id, student_id)
    total_days = len(date_range(start_date, end_date))
    recorded = _counts_by_date_rows(
        database.execute(
            select(Attendance.student_id, Attendance.status, func.count(Attendance.id))
            .join(Student, Attendance.student_id == Student.id)
            .where(*filters, Attendance.attendance_date >= start_date, Attendance.attendance_date <= end_date)
            .group_by(Attendance.student_id, Attendance.status)
        )
    )

    totals = []
    for student, classroom in database.execute(
        select(Student, ClassModel)
        .join(ClassModel, Student.class_id == ClassModel.id)
        .where(*filters)
        .order_by(ClassModel.grade, Student.student_code)
    ):
        statuses = recorded.get(student.id, {})
        present = statuses.get("present", 0)
        late = statuses.get("late", 0)
        row: dict[str, object] = {
            "student_id": student.id,
            "student_code": student.student_code,
            "student_name": f"{student.last_name} {student.first_name}",
            "class_name": classroom.class_name,
            "present_days": present,
            "late_days": late,
            "absent_days": max(0, total_days - present - late),
            "attendance_days": present + late,
            "total_days": total_days,
            "attendance_rate": round((present + late) * 100 / total_days, 2) if total_days else 0.0,
        }
        if pass_attendance_times is not None:
            row["passes"] = present + late >= pass_attendance_times
        totals.append(row)
    return totals


def _counts_by_date_rows(rows: Iterable[tuple[int, str, int]]) -> dict[int, dict[str, int]]:
    grouped: dict[int, dict[str, int]] = {}
    for student_id, status, count in rows:
        grouped.setdefault(student_id, {})[status] = count
    return grouped


def _report_row(
    student: Student,
    classroom: ClassModel,
    report_date: date,
    attendance: Attendance | None,
    attendance_days: int,
) -> dict[str, object]:
    return {
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
        "attendance_days": attendance_days,
    }
