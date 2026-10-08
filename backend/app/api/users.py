from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import CurrentUser, DatabaseSession, require_roles
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/api/users", tags=["អ្នកប្រើប្រាស់"])


@router.get("", response_model=list[UserRead])
def list_users(database: DatabaseSession, _: CurrentUser = require_roles("admin")) -> list[UserRead]:
    users = database.scalars(select(User).order_by(User.full_name)).all()
    return [UserRead.model_validate(user) for user in users]


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    database: DatabaseSession,
    _: CurrentUser = require_roles("admin"),
) -> UserRead:
    user = User(
        username=payload.username,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    database.add(user)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=409, detail="ឈ្មោះអ្នកប្រើប្រាស់នេះមានរួចហើយ។") from error
    database.refresh(user)
    return UserRead.model_validate(user)


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    database: DatabaseSession,
    current_user: CurrentUser,
) -> UserRead:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="អ្នកមិនមានសិទ្ធិប្រើមុខងារនេះទេ។")
    user = database.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញអ្នកប្រើប្រាស់នេះទេ។")
    updates = payload.model_dump(exclude_unset=True)
    if user.id == current_user.id and updates.get("role") == "teacher":
        raise HTTPException(status_code=422, detail="មិនអាចប្ដូរតួនាទីគណនីដែលកំពុងប្រើបានទេ។")
    if "password" in updates:
        user.password_hash = hash_password(updates.pop("password"))
    for field, value in updates.items():
        setattr(user, field, value)
    database.commit()
    database.refresh(user)
    return UserRead.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    database: DatabaseSession,
    current_user: CurrentUser,
) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="អ្នកមិនមានសិទ្ធិប្រើមុខងារនេះទេ។")
    if user_id == current_user.id:
        raise HTTPException(status_code=422, detail="មិនអាចលុបគណនីដែលកំពុងប្រើបានទេ។")
    user = database.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="រកមិនឃើញអ្នកប្រើប្រាស់នេះទេ។")
    if user.role == "admin":
        administrator_count = database.scalar(
            select(func.count(User.id)).where(User.role == "admin")
        ) or 0
        if administrator_count <= 1:
            raise HTTPException(status_code=409, detail="ប្រព័ន្ធត្រូវមានអ្នកគ្រប់គ្រងយ៉ាងតិចម្នាក់។")
    database.delete(user)
    database.commit()