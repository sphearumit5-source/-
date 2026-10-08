from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import numpy as np

from app.core.config import get_settings


class FaceProcessingError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class FaceMatch:
    student_id: int
    similarity: float


@dataclass(frozen=True)
class FaceAnalysis:
    face_count: int
    ready: bool
    centered: bool
    guidance: str


class FaceService:
    def __init__(self, models_directory: Path | None = None):
        import cv2

        self.cv2 = cv2
        directory = models_directory or get_settings().face_models_directory
        detector_path = directory / "face_detection_yunet_2023mar.onnx"
        recognizer_path = directory / "face_recognition_sface_2021dec.onnx"
        missing = [path.name for path in (detector_path, recognizer_path) if not path.is_file()]
        if missing:
            raise FaceProcessingError(
                "models_unavailable",
                f"មិនទាន់មាន model ស្គាល់មុខ៖ {', '.join(missing)}។ សូមរត់ python scripts/download_face_models.py។",
            )
        self.detector = cv2.FaceDetectorYN.create(
            str(detector_path), "", (320, 320), 0.8, 0.3, 5000
        )
        self.recognizer = cv2.FaceRecognizerSF.create(str(recognizer_path), "")
        self._inference_lock = Lock()

    def extract_embedding(self, image_data: bytes) -> np.ndarray:
        if not image_data or len(image_data) > get_settings().max_upload_bytes:
            raise FaceProcessingError("invalid_image", "រូបភាពទទេ ឬមានទំហំលើសកំណត់។")
        buffer = np.frombuffer(image_data, dtype=np.uint8)
        image = self.cv2.imdecode(buffer, self.cv2.IMREAD_COLOR)
        if image is None:
            raise FaceProcessingError("invalid_image", "មិនអាចអានរូបភាពនេះបានទេ។")
        height, width = image.shape[:2]
        if width < 160 or height < 160:
            raise FaceProcessingError("image_too_small", "រូបភាពតូចពេក សូមថតម្ដងទៀត។")
        with self._inference_lock:
            self.detector.setInputSize((width, height))
            _, faces = self.detector.detect(image)
        if faces is None or len(faces) == 0:
            raise FaceProcessingError("no_face", "មិនរកឃើញមុខទេ។")
        if len(faces) != 1:
            raise FaceProcessingError("multiple_faces", "រកឃើញមុខច្រើនជាងមួយ។")
        face = faces[0]
        x, y, face_width, face_height = face[:4]
        if min(face_width, face_height) < 80 or face[14] < 0.8:
            raise FaceProcessingError("low_quality", "មុខមិនច្បាស់គ្រប់គ្រាន់ សូមថតម្ដងទៀត។")
        with self._inference_lock:
            aligned = self.recognizer.alignCrop(image, face.reshape(1, -1))
            feature = self.recognizer.feature(aligned).astype(np.float32).reshape(-1)
        norm = float(np.linalg.norm(feature))
        if norm == 0:
            raise FaceProcessingError("low_quality", "មិនអាចបង្កើតទិន្នន័យមុខបានទេ។")
        return feature / norm

    def analyze(self, image_data: bytes) -> FaceAnalysis:
        """Read-only framing check used to guide auto-capture. Never touches the database."""
        if not image_data or len(image_data) > get_settings().max_upload_bytes:
            raise FaceProcessingError("invalid_image", "រូបភាពទទេ ឬមានទំហំលើសកំណត់។")
        buffer = np.frombuffer(image_data, dtype=np.uint8)
        image = self.cv2.imdecode(buffer, self.cv2.IMREAD_COLOR)
        if image is None:
            raise FaceProcessingError("invalid_image", "មិនអាចអានរូបភាពនេះបានទេ។")
        height, width = image.shape[:2]
        if width < 160 or height < 160:
            raise FaceProcessingError("image_too_small", "រូបភាពតូចពេក សូមថតម្ដងទៀត។")
        with self._inference_lock:
            self.detector.setInputSize((width, height))
            _, faces = self.detector.detect(image)
        if faces is None or len(faces) == 0:
            return FaceAnalysis(0, False, False, "សូមដាក់មុខនៅមុខកាមេរ៉ា។")
        if len(faces) != 1:
            return FaceAnalysis(int(len(faces)), False, False, "សូមឱ្យមានមុខតែមួយក្នុងស៊ុម។")
        face = faces[0]
        x, y, face_width, face_height = face[:4]
        score = float(face[14])
        center_x = x + face_width / 2
        center_y = y + face_height / 2
        centered = (0.38 * width <= center_x <= 0.62 * width) and (0.34 * height <= center_y <= 0.66 * height)
        big_enough = min(face_width, face_height) >= max(80.0, 0.22 * min(width, height))
        if min(face_width, face_height) < 80 or score < 0.8:
            return FaceAnalysis(1, False, centered, "សូមរក្សាមុខឱ្យនៅស្ងៀម និងមានពន្លឺគ្រប់គ្រាន់។")
        if not big_enough:
            return FaceAnalysis(1, False, centered, "សូមខិតមកជិតកាមេរ៉ាបន្តិចទៀត។")
        if not centered:
            return FaceAnalysis(1, False, False, "សូមដាក់មុខនៅកណ្ដាលស៊ុម។")
        return FaceAnalysis(1, True, True, "ល្អណាស់! កំពុងចាប់យកមុខ…")

    @staticmethod
    def cosine_similarity(first: np.ndarray, second: np.ndarray) -> float:
        left = np.asarray(first, dtype=np.float32).reshape(-1)
        right = np.asarray(second, dtype=np.float32).reshape(-1)
        if left.shape != right.shape or left.size == 0:
            return -1.0
        denominator = float(np.linalg.norm(left) * np.linalg.norm(right))
        if denominator == 0:
            return -1.0
        return float(np.dot(left, right) / denominator)

    def find_match(
        self,
        embedding: np.ndarray,
        known_embeddings: list[tuple[int, list[float]]],
    ) -> FaceMatch | None:
        threshold = get_settings().face_similarity_threshold
        best_by_student: dict[int, FaceMatch] = {}
        for student_id, stored_embedding in known_embeddings:
            similarity = self.cosine_similarity(embedding, np.asarray(stored_embedding))
            current = best_by_student.get(student_id)
            if current is None or similarity > current.similarity:
                best_by_student[student_id] = FaceMatch(student_id, similarity)
        matches = sorted(best_by_student.values(), key=lambda match: match.similarity, reverse=True)
        best = matches[0] if matches else None
        if best is None or best.similarity < threshold:
            return None
        if (
            len(matches) > 1
            and matches[1].similarity >= threshold
            and best.similarity - matches[1].similarity < get_settings().face_ambiguity_margin
        ):
            raise FaceProcessingError("ambiguous_match", "លទ្ធផលមុខមិនច្បាស់លាស់ សូមស្កេនម្ដងទៀត។")
        return best