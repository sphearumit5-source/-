from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.dependencies import CurrentUser, DatabaseSession
from app.models.attendance import Attendance
from app.models.student import Student
from app.schemas.attendance import AttendanceStatus
from app.schemas.dashboard import AttendanceChartPoint, DashboardChart, DashboardStats, RecentAttendance
from app.services.report_service import daily_summary

router = APIRouter(prefix="/api/dashboard", tags=["ផ្ទាំងគ្រប់គ្រង"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(database: DatabaseSession, _: CurrentUser) -> DashboardStats:
    totals = daily_summary(database, date.today())
    return DashboardStats(
        total_students=int(totals["total_students"]),
        present_today=int(totals["present"]),
        absent_today=int(totals["absent"]),
        late_today=int(totals["late"]),
        attendance_rate=float(totals["attendance_rate"]),
    )


@router.get("/recent", response_model=list[RecentAttendance])
def recent_attendance(
    database: DatabaseSession,
    _: CurrentUser,
    limit: int = Query(default=8, ge=1, le=50),
) -> list[RecentAttendance]:
    records = database.scalars(
        select(Attendance)
        .join(Student)
        .options(joinedload(Attendance.student).joinedload(Student.classroom))
        .order_by(Attendance.created_at.desc())
        .limit(limit)
    ).all()
    return [
        RecentAttendance(
            id=record.id,
            student_id=record.student.id,
            student_code=record.student.student_code,
            student_name=f"{record.student.last_name} {record.student.first_name}",
            photo=record.student.photo,
            class_name=record.student.classroom.class_name,
            check_in_time=record.check_in_time,
            status=record.status,
            confidence=record.confidence,
        )
        for record in records
    ]


@router.get("/chart", response_model=DashboardChart)
def attendance_chart(
    database: DatabaseSession,
    _: CurrentUser,
    period: Literal["week", "month"] = "week",
) -> DashboardChart:
    today = date.today()
    day_count = 7 if period == "week" else 30
    first_day = today - timedelta(days=day_count - 1)
    points = []
    for offset in range(day_count):
        current_day = first_day + timedelta(days=offset)
        totals = daily_summary(database, current_day)
        points.append(
            AttendanceChartPoint(
                label=current_day.strftime("%d/%m"),
                present=int(totals["present"]),
                absent=int(totals["absent"]),
                late=int(totals["late"]),
            )
        )
    return DashboardChart(period=period, points=points, generated_for=today)