from datetime import time

from pydantic import BaseModel, Field


class SchoolSettings(BaseModel):
    school_name: str = Field(default="សាលារៀន", min_length=1, max_length=160)
    logo_path: str | None = Field(default=None, max_length=512)
    school_start_time: time = time(7, 0)
    late_after_time: time = time(8, 0)
    school_days_per_week: int = Field(default=6, ge=1, le=7)