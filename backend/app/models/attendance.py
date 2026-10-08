from __future__ import annotations

from datetime import date, time
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, Enum, ForeignKey, Index, Numeric, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.student import Student


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("student_id", "attendance_date", name="uq_attendance_student_date"),
        Index("idx_attendance_date_status", "attendance_date", "status"),
        CheckConstraint(
            "confidence IS NULL OR confidence BETWEEN 0 AND 100",
            name="chk_attendance_confidence",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("students.id", name="fk_attendance_student", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    attendance_date: Mapped[date] = mapped_column(nullable=False)
    check_in_time: Mapped[time | None] = mapped_column()
    check_out_time: Mapped[time | None] = mapped_column()
    status: Mapped[str] = mapped_column(
        Enum("present", "absent", "late", name="attendance_status", native_enum=False, create_constraint=True),
        nullable=False,
    )
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[object] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())

    student: Mapped[Student] = relationship(back_populates="attendance_records")
