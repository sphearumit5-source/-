from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ClassCreate(BaseModel):
    class_name: str = Field(min_length=1, max_length=100)
    grade: int = Field(ge=1, le=12)
    section: str = Field(min_length=1, max_length=20)
    academic_year: str = Field(min_length=4, max_length=9)


class ClassUpdate(BaseModel):
    class_name: str | None = Field(default=None, min_length=1, max_length=100)
    grade: int | None = Field(default=None, ge=1, le=12)
    section: str | None = Field(default=None, min_length=1, max_length=20)
    academic_year: str | None = Field(default=None, min_length=4, max_length=9)

    @model_validator(mode="before")
    @classmethod
    def reject_null_required_fields(cls, value: object) -> object:
        required_fields = {"class_name", "grade", "section", "academic_year"}
        if isinstance(value, dict) and any(
            field in value and value[field] is None for field in required_fields
        ):
            raise ValueError("ព័ត៌មានថ្នាក់ចាំបាច់មិនអាចទទេបានទេ។")
        return value


class ClassRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_name: str
    grade: int
    section: str
    academic_year: str
    student_count: int
    created_at: datetime