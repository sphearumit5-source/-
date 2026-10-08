from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StudentFields(BaseModel):
    student_code: str = Field(min_length=1, max_length=40)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    gender: Literal["male", "female", "other"]
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = None
    class_id: int = Field(gt=0)
    status: Literal["active", "inactive"] = "active"


class StudentCreate(StudentFields):
    pass


class StudentUpdate(BaseModel):
    student_code: str | None = Field(default=None, min_length=1, max_length=40)
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    gender: Literal["male", "female", "other"] | None = None
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = None
    class_id: int | None = Field(default=None, gt=0)
    status: Literal["active", "inactive"] | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_null_required_fields(cls, value: object) -> object:
        required_fields = {
            "student_code", "first_name", "last_name", "gender", "class_id", "status"
        }
        if isinstance(value, dict) and any(
            field in value and value[field] is None for field in required_fields
        ):
            raise ValueError("ព័ត៌មានសិស្សចាំបាច់មិនអាចទទេបានទេ។")
        return value


class StudentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_code: str
    first_name: str
    last_name: str
    gender: Literal["male", "female", "other"]
    date_of_birth: date | None
    phone: str | None
    email: str | None
    address: str | None
    photo: str | None
    class_id: int
    class_name: str
    status: Literal["active", "inactive"]
    created_at: datetime
    updated_at: datetime


class StudentPage(BaseModel):
    items: list[StudentRead]
    total: int
    page: int
    page_size: int
    total_pages: int