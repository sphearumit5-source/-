
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# --------------------------------------------------
# Database configuration
# --------------------------------------------------

DATABASE_SCHEMA = str(
    getattr(settings, "database_schema", "student_attendance")
).strip()

# Validate schema name before using it in SQL
if (
    not DATABASE_SCHEMA
    or not DATABASE_SCHEMA.replace("_", "").isalnum()
    or DATABASE_SCHEMA[0].isdigit()
):
    raise ValueError("Invalid DATABASE_SCHEMA value")

DATABASE_URL = settings.database_url

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not configured")

# --------------------------------------------------
# SQLAlchemy engine
# --------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_timeout=10,
    connect_args={"connect_timeout": 10},
)

# --------------------------------------------------
# Set schema for each transaction
# --------------------------------------------------

@event.listens_for(engine, "begin")
def set_database_schema(connection) -> None:
    connection.exec_driver_sql(
        f'SET LOCAL search_path TO "{DATABASE_SCHEMA}", public'
    )

# --------------------------------------------------
# Session factory
# --------------------------------------------------

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)

# --------------------------------------------------
# Database health check
# --------------------------------------------------

def check_database_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

# --------------------------------------------------
# Verify required schema and tables
# --------------------------------------------------

def check_database_tables() -> dict:
    required_tables = {
        "users",
        "classes",
        "students",
        "face_encodings",
        "attendance",
    }

    try:
        with engine.connect() as connection:
            result = connection.execute(
                text(
                    """
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = :schema
                      AND table_type = 'BASE TABLE'
                    """
                ),
                {"schema": DATABASE_SCHEMA},
            )

            existing_tables = {row[0] for row in result}
            missing_tables = sorted(required_tables - existing_tables)

            return {
                "status": "ok" if not missing_tables else "error",
                "schema": DATABASE_SCHEMA,
                "existing_tables": sorted(existing_tables),
                "missing_tables": missing_tables,
            }

    except Exception:
        return {
            "status": "error",
            "schema": DATABASE_SCHEMA,
            "existing_tables": [],
            "missing_tables": sorted(required_tables),
        }
