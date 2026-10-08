from fastapi import APIRouter, HTTPException, status

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, DatabaseSession
from app.core.login_guard import get_login_guard
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, TokenResponse, UserSummary
from app.services.auth_service import authenticate_user

router = APIRouter(prefix="/api/auth", tags=["ការចូលប្រព័ន្ធ"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, database: DatabaseSession) -> TokenResponse:
    username = payload.username.strip()
    guard = get_login_guard()
    locked_seconds = guard.remaining_lockout(username)
    if locked_seconds > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"ការព្យាយាមចូលមិនបានជោគជ័យច្រើនដងពេក។ សូមព្យាយាមម្ដងទៀតក្នុងរយៈពេល {locked_seconds} វិនាទី។",
            headers={"Retry-After": str(locked_seconds)},
        )
    user = authenticate_user(database, payload.username, payload.password)
    if user is None:
        guard.record_failure(username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។",
            headers={"WWW-Authenticate": "Bearer"},
        )
    guard.record_success(username)
    settings = get_settings()
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserSummary.model_validate(user),
    )


@router.get("/me", response_model=UserSummary)
def current_user(current_user: CurrentUser) -> UserSummary:
    return UserSummary.model_validate(current_user)