import numpy as np
import pytest

from app.core.config import get_settings
from app.services.face_service import FaceProcessingError, FaceService


def test_cosine_similarity_handles_normalized_embeddings() -> None:
    same = FaceService.cosine_similarity(np.array([1.0, 0.0]), np.array([1.0, 0.0]))
    different = FaceService.cosine_similarity(np.array([1.0, 0.0]), np.array([0.0, 1.0]))
    assert same == 1.0
    assert different == 0.0


def test_cosine_similarity_rejects_invalid_shapes() -> None:
    assert FaceService.cosine_similarity(np.array([1.0]), np.array([1.0, 0.0])) == -1.0
    assert FaceService.cosine_similarity(np.array([0.0]), np.array([0.0])) == -1.0


def test_match_rejects_close_identity_scores(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://postgres:password@localhost:5432/student_attendance_db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
    get_settings.cache_clear()
    service = object.__new__(FaceService)
    with pytest.raises(FaceProcessingError) as error:
        service.find_match(
            np.array([1.0, 0.0]),
            [(1, [1.0, 0.0]), (2, [0.9999, 0.01])],
        )
    assert error.value.code == "ambiguous_match"
    get_settings.cache_clear()


def test_match_returns_none_below_threshold(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://postgres:password@localhost:5432/student_attendance_db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
    get_settings.cache_clear()
    service = object.__new__(FaceService)
    assert service.find_match(np.array([1.0, 0.0]), [(1, [-1.0, 0.0])]) is None
    get_settings.cache_clear()


def test_multiple_samples_for_same_student_are_not_ambiguous(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://postgres:password@localhost:5432/student_attendance_db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters")
    get_settings.cache_clear()
    service = object.__new__(FaceService)
    match = service.find_match(
        np.array([1.0, 0.0]),
        [(7, [1.0, 0.0]), (7, [0.999, 0.01])],
    )
    assert match is not None and match.student_id == 7
    get_settings.cache_clear()