from __future__ import annotations

from sqlalchemy import BigInteger, CheckConstraint, Index, SmallInteger, String, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ClassModel(Base):
    __tablename__ = "classes"
    __table_args__ = (
        UniqueConstraint("grade", "section", "academic_year", name="uq_classes_grade_section_year"),
        Index("idx_classes_name", "class_name"),
        CheckConstraint("grade BETWEEN 1 AND 12", name="chk_classes_grade"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    class_name: Mapped[str] = mapped_column(String(100), nullable=False)
    grade: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    section: Mapped[str] = mapped_column(String(20), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False)
    created_at: Mapped[object] = mapped_column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())

    students: Mapped[list[Student]] = relationship(back_populates="classroom")


from app.models.student import Student
