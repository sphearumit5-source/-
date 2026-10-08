from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import BigInteger, ForeignKey, Index, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.student import Student


class FaceEncoding(Base):
    __tablename__ = "face_encodings"
    __table_args__ = (Index("idx_face_encodings_student", "student_id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("students.id", name="fk_face_encodings_student", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    encoding_data: Mapped[list[Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[object] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    student: Mapped[Student] = relationship(back_populates="face_encodings")
