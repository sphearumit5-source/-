from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Enum, ForeignKey, Index, String, Text, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.attendance import Attendance
    from app.models.class_model import ClassModel
    from app.models.face_encoding import FaceEncoding


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint("student_code", name="uq_students_student_code"),
        UniqueConstraint("email", name="uq_students_email"),
        Index("idx_students_class_status", "class_id", "status"),
        Index("idx_students_name", "last_name", "first_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_code: Mapped[str] = mapped_column(String(40), nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    gender: Mapped[str] = mapped_column(
        Enum("male", "female", "other", name="student_gender", native_enum=False, create_constraint=True),
        nullable=False,
    )
    date_of_birth: Mapped[date | None]
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(254))
    address: Mapped[str | None] = mapped_column(Text)
    photo: Mapped[str | None] = mapped_column(String(512))
    class_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("classes.id", name="fk_students_class", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="student_status", native_enum=False, create_constraint=True),
        nullable=False,
        server_default="active",
    )
    created_at: Mapped[object] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    classroom: Mapped[ClassModel] = relationship(back_populates="students")
    face_encodings: Mapped[list[FaceEncoding]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    attendance_records: Mapped[list[Attendance]] = relationship(
        back_populates="student",
        passive_deletes=True,
    )
