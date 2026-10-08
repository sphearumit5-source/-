import app.models
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from app.database.database import engine

REQUIRED_TABLES = {"users", "classes", "students", "face_encodings", "attendance"}


def initialize_database() -> None:
    try:
        existing_tables = set(inspect(engine).get_table_names())
    except SQLAlchemyError as error:
        raise RuntimeError("មិនអាចភ្ជាប់ទៅ PostgreSQL បានទេ។ សូមពិនិត្យ DATABASE_URL។") from error

    missing_tables = REQUIRED_TABLES - existing_tables
    if missing_tables:
        missing = ", ".join(sorted(missing_tables))
        raise RuntimeError(
            f"មិនទាន់មានតារាង Database: {missing}. សូមរត់ database/schema.sql ជាមុន។"
        )


if __name__ == "__main__":
    initialize_database()
    print("បានផ្ទៀងផ្ទាត់តារាង Database រួចរាល់។")
