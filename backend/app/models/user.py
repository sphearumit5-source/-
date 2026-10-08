from __future__ import annotations

from sqlalchemy import BigInteger, Enum, Index, String, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("username", name="uq_users_username"),
        Index("idx_users_role", "role"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(80), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("admin", "teacher", name="user_role", native_enum=False, create_constraint=True),
        nullable=False,
    )
    created_at: Mapped[object] = mapped_column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
