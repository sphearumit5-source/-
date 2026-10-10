
import json
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.database.database import engine

from app.api import (
    auth,
    attendance,
    classes,
    dashboard,
    face,
    reports,
    settings as settings_api,
    students,
    users,
)

logger = logging.getLogger(__name__)

settings = get_settings()

# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title=settings.app_name,
    description="សេវា API សម្រាប់គ្រប់គ្រងសិស្ស និងវត្តមានតាមការស្គាល់មុខ",
    version="0.1.0",
)

# =========================================================
# CORS CONFIGURATION
# =========================================================

DEFAULT_ORIGINS = [
    "https://frontend-eight-liart-33.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def normalize_origins(value) -> list[str]:
    """Parse CORS origins from a list, JSON string, or CSV string."""

    if not value:
        return []

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return []

        if value.startswith("["):
            try:
                value = json.loads(value)
            except (ValueError, TypeError):
                logger.warning(
                    "CORS_ORIGINS is invalid JSON; using default origins"
                )
                return []

        else:
            value = value.split(",")

    if not isinstance(value, (list, tuple)):
        logger.warning("CORS_ORIGINS must be a list or string")
        return []

    result = []

    for item in value:
        origin = str(item).strip().strip('"').strip("'").rstrip("/")

        if origin.startswith(("http://", "https://")):
            result.append(origin)
        else:
            logger.warning("Ignoring invalid CORS origin: %s", origin)

    return result


# Pydantic Settings normally exposes this as settings.cors_origins.
cors_setting = getattr(settings, "cors_origins", None)

origins = list(
    dict.fromkeys(
        DEFAULT_ORIGINS + normalize_origins(cors_setting)
    )
)

logger.info("Configured CORS origins: %s", origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ROOT ROUTE
# =========================================================


@app.get("/", tags=["Root"])
def read_root():
    return {
        "status": "online",
        "message": "Welcome to Student Attendance API",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
    }


# =========================================================
# API ROUTES
# =========================================================

for api_router in (
    auth.router,
    students.router,
    classes.router,
    attendance.router,
    face.router,
    reports.router,
    dashboard.router,
    settings_api.router,
    users.router,
):
    app.include_router(api_router)


# =========================================================
# HEALTH CHECK
# =========================================================


@app.get("/health", tags=["System Health"])
def health_check():
    return {
        "status": "ok",
        "message": "API is running",
    }


# =========================================================
# READINESS CHECK
# =========================================================


@app.get("/ready", tags=["System Readiness"])
def readiness_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

    except SQLAlchemyError:
        logger.exception("Database readiness check failed")

        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "database": "unavailable",
            },
        )

    except Exception:
        logger.exception("Unexpected readiness check error")

        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "database": "unavailable",
            },
        )

    return {
        "status": "ok",
        "database": "ok",
    }
