
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import numpy as np

from app.core.config import get_settings


logger = logging.getLogger(__name__)


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
    DETECTOR_FILENAME = "face_detection_yunet_2023mar.onnx"
    RECOGNIZER_FILENAME = "face_recognition_sface_2021dec.onnx"

    def __init__(self, models_directory: Path | None = None):
        try:
            import cv2
        except ImportError as error:
            logger.exception("OpenCV import failed")
            raise FaceProcessingError(
                "models_unavailable",
                "OpenCV មិនទាន់បានដំឡើងទេ។",
            ) from error

        self.cv2 = cv2

        if not hasattr(cv2, "FaceDetectorYN"):
            logger.error(
                "OpenCV FaceDetectorYN is unavailable; version=%s",
                getattr(cv2, "__version__", "unknown"),
            )
            raise FaceProcessingError(
                "models_unavailable",
                "OpenCV មិនមាន FaceDetectorYN ទេ។",
            )

        if not hasattr(cv2, "FaceRecognizerSF"):
            logger.error(
                "OpenCV FaceRecognizerSF is unavailable; version=%s",
                getattr(cv2, "__version__", "unknown"),
            )
            raise FaceProcessingError(
                "models_unavailable",
                "OpenCV មិនមាន FaceRecognizerSF ទេ។",
            )

        project_root = Path(__file__).resolve().parents[2]

        configured_directory = (
            Path(models_directory)
            if models_directory is not None
            else Path(get_settings().face_models_directory)
        )

        if configured_directory.is_absolute():
            directory = configured_directory
        else:
            directory = project_root / configured_directory

        directory = directory.resolve()

        detector_path = directory / self.DETECTOR_FILENAME
        recognizer_path = directory / self.RECOGNIZER_FILENAME

        logger.info("Face models directory: %s", directory)
        logger.info(
            "Face detector model exists: %s",
            detector_path.is_file(),
        )
        logger.info(
            "Face recognizer model exists: %s",
            recognizer_path.is_file(),
        )

        missing = [
            path.name
            for path in (detector_path, recognizer_path)
            if not path.is_file()
        ]

        if missing:
            logger.error(
                "Face model files missing: directory=%s files=%s",
                directory,
                ", ".join(missing),
            )
            raise FaceProcessingError(
                "models_unavailable",
                "មិនមានឯកសារ Face Models៖ " + ", ".join(missing),
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

            if self.detector is None or self.recognizer is None:
                raise RuntimeError(
                    "OpenCV returned an empty face model."
                )

        except Exception as error:
            logger.exception("Failed to initialize YuNet/SFace models")
            raise FaceProcessingError(
                "models_unavailable",
                "មិនអាចបើក Face Models បានទេ។",
            ) from error

        self._inference_lock = Lock()

        logger.info("FaceService initialized successfully")

    # -----------------------------------------------------
    # IMAGE DECODING
    # -----------------------------------------------------

    def _decode_image(self, image_data: bytes) -> np.ndarray:
        max_bytes = get_settings().max_upload_bytes

        if not image_data or len(image_data) > max_bytes:
            raise FaceProcessingError(
                "invalid_image",
                "រូបភាពទទេ ឬមានទំហំលើសកំណត់។",
            )

        try:
            buffer = np.frombuffer(image_data, dtype=np.uint8)
            image = self.cv2.imdecode(
                buffer,
                self.cv2.IMREAD_COLOR,
            )
        except Exception as error:
            logger.exception("Image decoding failed")
            raise FaceProcessingError(
                "invalid_image",
                "មិនអាចអានរូបភាពនេះបានទេ។",
            ) from error

        if image is None or image.ndim != 3:
            raise FaceProcessingError(
                "invalid_image",
                "ឯកសារនេះមិនមែនជារូបភាពត្រឹមត្រូវទេ។",
            )

        height, width = image.shape[:2]

        if width < 160 or height < 160:
            raise FaceProcessingError(
                "image_too_small",
                "រូបភាពតូចពេក។",
            )

        return image

    # -----------------------------------------------------
    # FACE DETECTION
    # -----------------------------------------------------

    def _detect_faces(self, image: np.ndarray) -> np.ndarray | None:
        height, width = image.shape[:2]

        try:
            with self._inference_lock:
                self.detector.setInputSize((width, height))
                _, faces = self.detector.detect(image)

            return faces

        except Exception as error:
            logger.exception("YuNet face detection failed")
            raise FaceProcessingError(
                "models_unavailable",
                "Face Detection Model មានបញ្ហាពេលដំណើរការ។",
            ) from error

    # -----------------------------------------------------
    # EMBEDDING EXTRACTION
    # -----------------------------------------------------

    def extract_embedding(self, image_data: bytes) -> np.ndarray:
        image = self._decode_image(image_data)
        faces = self._detect_faces(image)

        if faces is None or len(faces) == 0:
            raise FaceProcessingError(
                "no_face",
                "មិនរកឃើញមុខទេ។",
            )

        if len(faces) != 1:
            raise FaceProcessingError(
                "multiple_faces",
                "រកឃើញមុខច្រើនជាងមួយ។",
            )

        face = faces[0]
        face_width = float(face[2])
        face_height = float(face[3])
        score = float(face[14])

        if min(face_width, face_height) < 80 or score < 0.8:
            raise FaceProcessingError(
                "low_quality",
                "មុខមិនច្បាស់គ្រប់គ្រាន់។",
            )

        try:
            with self._inference_lock:
                aligned = self.recognizer.alignCrop(
                    image,
                    face.reshape(1, -1),
                )
                feature = self.recognizer.feature(aligned)

            feature = np.asarray(
                feature,
                dtype=np.float32,
            ).reshape(-1)

        except Exception as error:
            logger.exception("SFace embedding extraction failed")
            raise FaceProcessingError(
                "models_unavailable",
                "មិនអាចបង្កើតទិន្នន័យមុខបានទេ។",
            ) from error

        norm = float(np.linalg.norm(feature))

        if not np.isfinite(norm) or norm == 0:
            raise FaceProcessingError(
                "low_quality",
                "ទិន្នន័យមុខមិនត្រឹមត្រូវ។",
            )

        normalized = feature / norm

        if not np.all(np.isfinite(normalized)):
            raise FaceProcessingError(
                "low_quality",
                "ទិន្នន័យមុខមិនត្រឹមត្រូវ។",
            )

        return normalized.astype(np.float32)

    # -----------------------------------------------------
    # CAMERA FRAME ANALYSIS
    # -----------------------------------------------------

    def analyze(self, image_data: bytes) -> FaceAnalysis:
        image = self._decode_image(image_data)
        faces = self._detect_faces(image)

        if faces is None or len(faces) == 0:
            return FaceAnalysis(
                face_count=0,
                ready=False,
                centered=False,
                guidance="សូមដាក់មុខនៅមុខកាមេរ៉ា។",
            )

        if len(faces) != 1:
            return FaceAnalysis(
                face_count=int(len(faces)),
                ready=False,
                centered=False,
                guidance="សូមឱ្យមានមុខតែមួយក្នុងស៊ុម។",
            )

        height, width = image.shape[:2]
        face = faces[0]

        x = float(face[0])
        y = float(face[1])
        face_width = float(face[2])
        face_height = float(face[3])
        score = float(face[14])

        center_x = x + face_width / 2
        center_y = y + face_height / 2

        centered = (
            0.38 * width <= center_x <= 0.62 * width
            and 0.34 * height <= center_y <= 0.66 * height
        )

        big_enough = (
            min(face_width, face_height)
            >= max(80.0, 0.22 * min(width, height))
        )

        if min(face_width, face_height) < 80 or score < 0.8:
            return FaceAnalysis(
                face_count=1,
                ready=False,
                centered=centered,
                guidance="សូមរក្សាមុខឱ្យនៅស្ងៀម និងមានពន្លឺគ្រប់គ្រាន់។",
            )

        if not big_enough:
            return FaceAnalysis(
                face_count=1,
                ready=False,
                centered=centered,
                guidance="សូមខិតមកជិតកាមេរ៉ាបន្តិចទៀត។",
            )

        if not centered:
            return FaceAnalysis(
                face_count=1,
                ready=False,
                centered=False,
                guidance="សូមដាក់មុខនៅកណ្ដាលស៊ុម។",
            )

        return FaceAnalysis(
            face_count=1,
            ready=True,
            centered=True,
            guidance="ល្អណាស់! កំពុងចាប់យកមុខ…",
        )

    # -----------------------------------------------------
    # COSINE SIMILARITY
    # -----------------------------------------------------

    @staticmethod
    def cosine_similarity(
        first: np.ndarray,
        second: np.ndarray,
    ) -> float:
        left = np.asarray(first, dtype=np.float32).reshape(-1)
        right = np.asarray(second, dtype=np.float32).reshape(-1)

        if left.shape != right.shape or left.size == 0:
            return -1.0

        if not np.all(np.isfinite(left)):
            return -1.0

        if not np.all(np.isfinite(right)):
            return -1.0

        denominator = float(
            np.linalg.norm(left) * np.linalg.norm(right)
        )

        if denominator == 0 or not np.isfinite(denominator):
            return -1.0

        similarity = float(np.dot(left, right) / denominator)

        return max(-1.0, min(1.0, similarity))

    # -----------------------------------------------------
    # MATCH STUDENT
    # -----------------------------------------------------

    def find_match(
        self,
        embedding: np.ndarray,
        known_embeddings: list[tuple[int, list[float]]],
    ) -> FaceMatch | None:
        settings = get_settings()

        threshold = settings.face_similarity_threshold
        ambiguity_margin = settings.face_ambiguity_margin

        best_by_student: dict[int, FaceMatch] = {}

        for student_id, stored_embedding in known_embeddings:
            similarity = self.cosine_similarity(
                embedding,
                np.asarray(stored_embedding, dtype=np.float32),
            )

            current = best_by_student.get(int(student_id))

            if current is None or similarity > current.similarity:
                best_by_student[int(student_id)] = FaceMatch(
                    student_id=int(student_id),
                    similarity=similarity,
                )

        matches = sorted(
            best_by_student.values(),
            key=lambda item: item.similarity,
            reverse=True,
        )

        if not matches:
            return None

        best = matches[0]

        if best.similarity < threshold:
            return None

        if (
            len(matches) > 1
            and matches[1].similarity >= threshold
            and best.similarity - matches[1].similarity
            < ambiguity_margin
        ):
            raise FaceProcessingError(
                "ambiguous_match",
                "លទ្ធផលមុខមិនច្បាស់លាស់។",
            )

        return best