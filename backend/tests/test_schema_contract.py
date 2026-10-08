import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://postgres:password@localhost:5432/student_attendance_db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")

import app.models
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from app.models.base import Base


def test_orm_metadata_matches_named_sql_constraints() -> None:
    expected = {
        "users": {"uq_users_username"},
        "classes": {"uq_classes_grade_section_year", "chk_classes_grade"},
        "students": {"uq_students_student_code", "uq_students_email", "fk_students_class"},
        "face_encodings": {"fk_face_encodings_student"},
        "attendance": {"uq_attendance_student_date", "chk_attendance_confidence", "fk_attendance_student"},
    }
    for table_name, expected_names in expected.items():
        names = {constraint.name for constraint in Base.metadata.tables[table_name].constraints}
        assert expected_names <= names


def test_postgresql_ddl_uses_bigserial_and_jsonb() -> None:
    dialect = postgresql.dialect()
    for table_name in ("users", "classes", "students", "face_encodings", "attendance"):
        ddl = str(CreateTable(Base.metadata.tables[table_name]).compile(dialect=dialect))
        assert "BIGSERIAL" in ddl
    face_ddl = str(CreateTable(Base.metadata.tables["face_encodings"]).compile(dialect=dialect))
    assert "JSONB" in face_ddl