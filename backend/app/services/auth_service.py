
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user import User


def authenticate_user(
    database: Session,
    username: str,
    password: str,
) -> User | None:

    # Remove accidental spaces from username
    username = username.strip()

    # Empty username/password
    if not username or not password:
        return None

    # Find user by username
    user = database.scalar(
        select(User).where(
            User.username == username
        )
    )

    # User not found
    if user is None:
        return None

    # Verify password
    if not verify_password(
        password,
        user.password_hash,
    ):
        return None

    # Optional active-account check
    if hasattr(user, "is_active"):
        if not user.is_active:
            return None

    return user

