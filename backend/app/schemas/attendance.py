from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

AttendanceStatus = Literal["present", "absent", "late"]


class AttendanceCreate(BaseModel):
    student_id: int = Field(gt=0)
    attendance_date: date = Field(default_factory=date.today)
    check_in_time: time | None = None
    check_out_time: time | None = None
    status: AttendanceStatus | None = None
    confidence: Decimal | None = Field(default=None, ge=0, le=100)


class AttendanceUpdate(BaseModel):
    check_in_time: time | None = None
    check_out_time: time | None = None
    status: AttendanceStatus | None = None
    confidence: Decimal | None = Field(default=None, ge=0, le=100)

    @model_validator(mode="before")
    @classmethod
    def reject_null_status(cls, value: object) -> object:
        if isinstance(value, dict) and "status" in value and value["status"] is None:
            raise ValueError("ស្ថានភាពវត្តមានមិនអាចទទេបានទេ។")
        return value


class AttendanceRead(BaseModel):
    id: int
    student_id: int
    student_code: str
    student_name: str
    class_name: str
    attendance_date: date
    check_in_time: time | None
    check_out_time: time | None
    status: AttendanceStatus
    confidence: Decimal | None
    created_at: datetime


class AttendancePage(BaseModel):
    items: list[AttendanceRead]
    total: int
    page: int
    page_size: int
    total_pages: int