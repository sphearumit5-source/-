
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

import json
import logging

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

# =========================================================
# LOGGING
# =========================================================

logger = logging.getLogger(__name__)

# =========================================================
# SETTINGS
# =========================================================

settings = get_settings()

# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title=settings.app_name,
    description="សេវា API សម្រាប់គ្រប់គ្រងសិស្ស និងវត្តមានតាមការស្គាល់មុខ",
    version="0.1.0",
)

# =========================================================
# CORS CONFIGURATION
# =========================================================

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://frontend-eight-liart-33.vercel.app",
]


def normalize_origins(value):
    """ទទួល CORS origins ពី Environment Variables។"""

    if not value:
        return []

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return []

        # គាំទ្រ JSON list:
        # ["https://example.vercel.app"]
        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    value = parsed
                else:
                    return []
            except (ValueError, TypeError):
                logger.warning("CORS_ORIGINS JSON format is invalid")
                return []
        else:
            # គាំទ្រ comma-separated domains
            value = value.split(",")

    if not isinstance(value, (list, tuple)):
        return []

    result = []

    for item in value:
        origin = str(item).strip().strip('"').strip("'").rstrip("/")

        if origin:
            result.append(origin)

    return result


cors_setting = getattr(
    settings,
    "CORS_ORIGINS",
    getattr(settings, "cors_origins", None),
)

origins.extend(normalize_origins(cors_setting))

# ដក origins ស្ទួន
origins = list(dict.fromkeys(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,

    # អនុញ្ញាត localhost និង Vercel deployment domains
    allow_origin_regex=(
        r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
        r"|https://[a-zA-Z0-9-]+\.vercel\.app"
    ),

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