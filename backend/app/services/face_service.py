
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from app.core.config import get_settings


class FaceProcessingError(Exception):
    """Error raised while processing a face."""

    def __init__(self, message: str, code: str = "processing_error"):
        super().__init__(message)
        self.code = code


@dataclass
class FaceAnalysis:
    face_count: int
    faces: list[dict[str, Any]]
    ready: bool
    centered: bool
    guidance: str


@dataclass
class FaceMatch:
    student_id: int
    similarity: float


class FaceService:
    """Face detection and recognition using OpenCV YuNet and SFace."""

    DETECTOR_FILENAME = "face_detection_yunet_2023mar.onnx"
    RECOGNIZER_FILENAME = "face_recognition_sface_2021dec.onnx"

    WINDOWS_FALLBACK_DIRECTORY = Path(r"C:\face-model-test")
    FALLBACK_DETECTOR_FILENAME = "yunet.onnx"
    FALLBACK_RECOGNIZER_FILENAME = "sface.onnx"

    def __init__(
        self,
        models_directory: str | Path | None = None,
    ) -> None:
        if not hasattr(cv2, "FaceDetectorYN"):
            raise RuntimeError(
                "FaceDetectorYN unavailable. Install compatible OpenCV."
            )

        if not hasattr(cv2, "FaceRecognizerSF"):
            raise RuntimeError(
                "FaceRecognizerSF unavailable. Install compatible OpenCV."
            )

        settings = get_settings()
        project_root = Path(__file__).resolve().parents[2]

        configured_directory = (
            Path(models_directory)
            if models_directory is not None
            else Path(settings.face_models_directory)
        )

        directory = (
            configured_directory
            if configured_directory.is_absolute()
            else project_root / configured_directory
        ).resolve()

        detector_path = directory / self.DETECTOR_FILENAME
        recognizer_path = directory / self.RECOGNIZER_FILENAME

        if os.name == "nt":
            fallback = self.WINDOWS_FALLBACK_DIRECTORY
            fallback_detector = fallback / self.FALLBACK_DETECTOR_FILENAME
            fallback_recognizer = fallback / self.FALLBACK_RECOGNIZER_FILENAME

            if fallback_detector.is_file() and fallback_recognizer.is_file():
                detector_path = fallback_detector
                recognizer_path = fallback_recognizer

        if not detector_path.is_file():
            raise FileNotFoundError(
                f"YuNet model file not found: {detector_path}"
            )

        if not recognizer_path.is_file():
            raise FileNotFoundError(
                f"SFace model file not found: {recognizer_path}"
            )

        try:
            self.detector = cv2.FaceDetectorYN.create(
                str(detector_path),
                "",
                (320, 320),
                0.8,
                0.3,
                5000,
            )
            self.recognizer = cv2.FaceRecognizerSF.create(
                str(recognizer_path),
                "",
            )
        except cv2.error as exc:
            raise RuntimeError(
                f"Could not load face models: {exc}"
            ) from exc

        self.similarity_threshold = float(
            getattr(settings, "face_similarity_threshold", 0.363)
        )
        self.ambiguity_margin = float(
            getattr(settings, "face_ambiguity_margin", 0.03)
        )

    @staticmethod
    def _decode_image(image_bytes: bytes) -> np.ndarray:
        if not image_bytes:
            raise FaceProcessingError(
                "Image data is empty.",
                "invalid_image",
            )

        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if image is None or image.size == 0:
            raise FaceProcessingError(
                "Invalid image. Upload a valid JPG or PNG.",
                "invalid_image",
            )

        return image

    def _detect_faces(self, image: np.ndarray) -> list[np.ndarray]:
        if image is None or image.size == 0:
            raise FaceProcessingError(
                "Image is empty.",
                "invalid_image",
            )

        if image.ndim != 3 or image.shape[2] != 3:
            raise FaceProcessingError(
                "Expected a three-channel BGR image.",
                "invalid_image",
            )

        height, width = image.shape[:2]
        self.detector.setInputSize((width, height))

        try:
            _, detected_faces = self.detector.detect(image)
        except cv2.error as exc:
            raise FaceProcessingError(
                f"Face detection failed: {exc}"
            ) from exc

        if detected_faces is None:
            return []

        return [
            np.asarray(face, dtype=np.float32)
            for face in detected_faces
        ]

    def extract_embedding(
        self,
        image: bytes | np.ndarray,
        face: np.ndarray | None = None,
    ) -> np.ndarray:
        """Accept either uploaded image bytes or a BGR image array."""
        if isinstance(image, bytes):
            image = self._decode_image(image)

        if not isinstance(image, np.ndarray):
            raise FaceProcessingError(
                "Unsupported image format.",
                "invalid_image",
            )

        if face is None:
            detected_faces = self._detect_faces(image)

            if len(detected_faces) == 0:
                raise FaceProcessingError(
                    "No face detected.",
                    "no_face",
                )

            if len(detected_faces) > 1:
                raise FaceProcessingError(
                    "Multiple faces detected.",
                    "multiple_faces",
                )

            face = detected_faces[0]

        try:
            aligned_face = self.recognizer.alignCrop(image, face)
            embedding = self.recognizer.feature(aligned_face)
        except cv2.error as exc:
            raise FaceProcessingError(
                f"Face feature extraction failed: {exc}"
            ) from exc

        if embedding is None or embedding.size == 0:
            raise FaceProcessingError(
                "Could not extract face features.",
                "low_quality",
            )

        embedding = np.asarray(
            embedding,
            dtype=np.float32,
        ).reshape(-1)

        norm = float(np.linalg.norm(embedding))

        if not np.isfinite(norm) or norm <= 0:
            raise FaceProcessingError(
                "Invalid face embedding.",
                "low_quality",
            )

        return embedding / norm

    def analyze(self, image_bytes: bytes) -> FaceAnalysis:
        """Detect faces and return status for the frontend scanner."""
        image = self._decode_image(image_bytes)
        detected_faces = self._detect_faces(image)

        height, width = image.shape[:2]
        results: list[dict[str, Any]] = []

        for face in detected_faces:
            x, y, box_width, box_height = (
                int(round(value)) for value in face[:4]
            )

            results.append(
                {
                    "bbox": {
                        "x": x,
                        "y": y,
                        "width": box_width,
                        "height": box_height,
                    },
                    "confidence": (
                        float(face[14]) if len(face) > 14 else 0.0
                    ),
                }
            )

        face_count = len(results)
        centered = False
        ready = False

        if face_count == 0:
            guidance = "មិនរកឃើញមុខទេ។ សូមដាក់មុខនៅមុខកាមេរ៉ា។"

        elif face_count > 1:
            guidance = "រកឃើញមុខច្រើន។ សូមឱ្យមានមនុស្សម្នាក់ប៉ុណ្ណោះ។"

        else:
            bbox = results[0]["bbox"]
            face_center_x = bbox["x"] + bbox["width"] / 2
            face_center_y = bbox["y"] + bbox["height"] / 2

            centered = (
                abs(face_center_x - width / 2) <= width * 0.20
                and abs(face_center_y - height / 2) <= height * 0.20
            )

            ready = centered

            guidance = (
                "មុខនៅទីតាំងត្រឹមត្រូវ។ អាចស្កេនបាន។"
                if centered
                else "សូមដាក់មុខនៅកណ្ដាលកាមេរ៉ា។"
            )

        return FaceAnalysis(
            face_count=face_count,
            faces=results,
            ready=ready,
            centered=centered,
            guidance=guidance,
        )

    @staticmethod
    def cosine_similarity(
        embedding_a: list[float] | np.ndarray,
        embedding_b: list[float] | np.ndarray,
    ) -> float:
        vector_a = np.asarray(
            embedding_a,
            dtype=np.float32,
        ).reshape(-1)

        vector_b = np.asarray(
            embedding_b,
            dtype=np.float32,
        ).reshape(-1)

        if vector_a.size == 0 or vector_b.size == 0:
            return 0.0

        if vector_a.shape != vector_b.shape:
            return 0.0

        if not (
            np.all(np.isfinite(vector_a))
            and np.all(np.isfinite(vector_b))
        ):
            return 0.0

        norm_a = float(np.linalg.norm(vector_a))
        norm_b = float(np.linalg.norm(vector_b))

        if norm_a <= 0 or norm_b <= 0:
            return 0.0

        similarity = float(
            np.dot(vector_a, vector_b) / (norm_a * norm_b)
        )

        return max(-1.0, min(1.0, similarity))

    def find_match(
        self,
        query_embedding: list[float] | np.ndarray,
        known_faces: list[Any],
    ) -> FaceMatch | None:
        """
        Accept records as:
        - (student_id, embedding_data) tuples from SQLAlchemy
        - dictionaries containing student_id and embedding
        """
        if not known_faces:
            return None

        matches: list[tuple[float, int]] = []

        for record in known_faces:
            student_id: Any = None
            stored_embedding: Any = None

            if isinstance(record, (tuple, list)) and len(record) >= 2:
                student_id, stored_embedding = record[0], record[1]

            elif isinstance(record, dict):
                student_id = record.get("student_id")
                stored_embedding = record.get(
                    "embedding",
                    record.get("encoding_data"),
                )

            if student_id is None or stored_embedding is None:
                continue

            try:
                student_id = int(student_id)

                if isinstance(stored_embedding, str):
                    import json
                    stored_embedding = json.loads(stored_embedding)

                similarity = self.cosine_similarity(
                    query_embedding,
                    stored_embedding,
                )
            except (TypeError, ValueError):
                continue

            matches.append((similarity, student_id))

        if not matches:
            return None

        matches.sort(key=lambda item: item[0], reverse=True)

        best_similarity, best_student_id = matches[0]

        if best_similarity < self.similarity_threshold:
            return None

        if len(matches) > 1:
            second_similarity = matches[1][0]

            if (
                best_similarity - second_similarity
                < self.ambiguity_margin
            ):
                return None

        return FaceMatch(
            student_id=best_student_id,
            similarity=best_similarity,
        )
