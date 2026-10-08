from datetime import date, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from app.schemas.attendance import AttendanceStatus


class DashboardStats(BaseModel):
    total_students: int
    present_today: int
    absent_today: int
    late_today: int
    attendance_rate: float


class RecentAttendance(BaseModel):
    id: int
    student_id: int
    student_code: str
    student_name: str
    photo: str | None
    class_name: str
    check_in_time: time | None
    status: AttendanceStatus
    confidence: Decimal | None


class AttendanceChartPoint(BaseModel):
    label: str
    present: int
    absent: int
    late: int


class DashboardChart(BaseModel):
    period: Literal["week", "month"]
    points: list[AttendanceChartPoint]
    generated_for: date