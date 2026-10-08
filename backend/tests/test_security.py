from app.core.security import create_access_token, decode_access_token, hash_password, verify_password

ADMIN_SEED_HASH = "pbkdf2_sha256$600000$6cba97ec06b4f51e26774c5058936648$af509d460f606ec7b3e9af6e74d003fb2abae89a01e55ab6d623a8ca7d87ed23"
TEACHER_SEED_HASH = "pbkdf2_sha256$600000$ac84c8951bdf0aa6b3636df38b0a3dea$3358ea32ac36e942259576d6ae8105553a1277c0d4f1c032d0062db3f98118e4"


def test_seed_password_hashes_verify() -> None:
    assert verify_password("School-Demo-2026!", ADMIN_SEED_HASH)
    assert verify_password("School-Demo-2026!", TEACHER_SEED_HASH)
    assert not verify_password("wrong-password", ADMIN_SEED_HASH)


def test_hash_password_round_trip_and_unique_salt() -> None:
    first = hash_password("correct horse battery staple")
    second = hash_password("correct horse battery staple")
    assert first != second
    assert verify_password("correct horse battery staple", first)
    assert not verify_password("incorrect", first)


def test_malformed_hash_is_rejected() -> None:
    assert not verify_password("password", "not-a-valid-hash")
    assert not verify_password("password", "pbkdf2_sha256$9$aa$bb")


def test_access_token_contains_subject_and_role(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://postgres:password@localhost:5432/student_attendance_db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
    from app.core.config import get_settings

    get_settings.cache_clear()
    claims = decode_access_token(create_access_token("42", "teacher"))
    assert claims is not None
    assert claims["sub"] == "42"
    assert claims["role"] == "teacher"
    get_settings.cache_clear()