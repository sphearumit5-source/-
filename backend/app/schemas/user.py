from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern="^[A-Za-z0-9_.-]+$")
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=12, max_length=128)
    role: Literal["admin", "teacher"]


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    password: str | None = Field(default=None, min_length=12, max_length=128)
    role: Literal["admin", "teacher"] | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_null_values(cls, value: object) -> object:
        if isinstance(value, dict) and any(item is None for item in value.values()):
            raise ValueError("ព័ត៌មានអ្នកប្រើប្រាស់មិនអាចទទេបានទេ។")
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    role: Literal["admin", "teacher"]