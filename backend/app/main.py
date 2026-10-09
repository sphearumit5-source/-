
import re

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

# ទទួល CORS origins ពី Environment Variables
cors_setting = getattr(
    settings,
    "CORS_ORIGINS",
    getattr(settings, "cors_origins", None),
)

if cors_setting:
    if isinstance(cors_setting, str):
        extra_origins = [
            item.strip().rstrip("/")
            for item in cors_setting.split(",")
            if item.strip()
        ]
    elif isinstance(cors_setting, (list, tuple)):
        extra_origins = [
            str(item).strip().rstrip("/")
            for item in cors_setting
            if str(item).strip()
        ]
    else:
        extra_origins = []

    origins.extend(extra_origins)

# ដក URL ស្ទួន និងដក slash ខាងចុង
origins = list(dict.fromkeys(
    origin.rstrip("/") for origin in origins
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,

    # អនុញ្ញាត localhost និង Vercel preview/production domains
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