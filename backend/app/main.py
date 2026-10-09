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

# ប្រមូលផ្តុំ origins ចាំបាច់ + ចេញពី Environment Variables (CORS_ORIGINS)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://frontend-eight-liart-33.vercel.app",  # Domain របស់ Frontend
]

if hasattr(settings, "CORS_ORIGINS") and settings.CORS_ORIGINS:
    if isinstance(settings.CORS_ORIGINS, list):
        origins.extend(settings.CORS_ORIGINS)
    elif isinstance(settings.CORS_ORIGINS, str):
        origins.append(settings.CORS_ORIGINS)

# ដក Domain ដែលជាន់គ្នាចេញ (Remove Duplicates)
origins = list(set(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ROOT ROUTE (ដើម្បីកុំឱ្យចេញ 404 នៅពេលបើកទំព័រដើម)
# =========================================================

@app.get("/", tags=["Root"])
def read_root():
    return {
        "status": "online",
        "message": "Welcome to Student Attendance API",
        "docs": "/docs",
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

@app.get(
    "/health",
    tags=["សុខភាពប្រព័ន្ធ"],
)
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
    }

# =========================================================
# READINESS CHECK
# =========================================================

@app.get(
    "/ready",
    tags=["សុខភាពប្រព័ន្ធ"],
)
def readiness_check() -> dict[str, str]:
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