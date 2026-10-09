
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import numpy as np

from app.core.config import get_settings


logger = logging.getLogger(__name__)


# =========================================================
# CUSTOM ERROR
# =========================================================

class FaceProcessingError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


# =========================================================
# DATA CLASSES
# =========================================================

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


# =========================================================
# FACE SERVICE
# =========================================================

class FaceService:

    def __init__(self, models_directory: Path | None = None):
        try:
            import cv2
        except ImportError as error:
            logger.exception("OpenCV is not installed")
            raise FaceProcessingError(
                "models_unavailable",
                "OpenCV មិនទាន់បានដំឡើងនៅលើ Backend ទេ។",
            ) from error

        self.cv2 = cv2

        directory = (
            Path(models_directory)
            if models_directory is not None
            else Path(get_settings().face_models_directory)
        )

        detector_path = directory / "face_detection_yunet_2023mar.onnx"
        recognizer_path = directory / "face_recognition_sface_2021dec.onnx"

        missing = [
            path.name
            for path in (detector_path, recognizer_path)
            if not path.is_file()
        ]

        if missing:
            logger.error(
                "Face model files missing in %s: %s",
                directory,
                ", ".join(missing),
            )

            raise FaceProcessingError(
                "models_unavailable",
                (
                    "មិនទាន់មាន Face Model៖ "
                    + ", ".join(missing)
                    + "។ សូមពិនិត្យទីតាំងឯកសារ Model ក្នុង Deployment។"
                ),
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

        except Exception as error:
            logger.exception("Failed to initialize face models")

            raise FaceProcessingError(
                "models_unavailable",
                "មិនអាចបើក Face Model បានទេ។",
            ) from error

        if self.detector is None or self.recognizer is None:
            raise FaceProcessingError(
                "models_unavailable",
                "Face Model មិនអាចដំណើរការបានទេ។",
            )

        # Detector និង recognizer ត្រូវប្រើ Lock ដើម្បីជៀសវាង
        # ការប៉ះទង្គិចពេលមានសំណើច្រើនក្នុងពេលតែមួយ។
        self._inference_lock = Lock()

    # =====================================================
    # DECODE IMAGE
    # =====================================================

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
                "ឯកសារនេះមិនមែនជារូបភាពដែលអាចអានបានទេ។",
            )

        height, width = image.shape[:2]

        if width < 160 or height < 160:
            raise FaceProcessingError(
                "image_too_small",
                "រូបភាពតូចពេក សូមថតម្ដងទៀត។",
            )

        return image

    # =====================================================
    # DETECT FACES
    # =====================================================

    def _detect_faces(
        self,
        image: np.ndarray,
    ) -> np.ndarray | None:

        height, width = image.shape[:2]

        try:
            with self._inference_lock:
                self.detector.setInputSize((width, height))
                _, faces = self.detector.detect(image)

            return faces

        except Exception as error:
            logger.exception("Face detection inference failed")

            raise FaceProcessingError(
                "models_unavailable",
                "Face Detection Model មានបញ្ហាពេលដំណើរការ។",
            ) from error

    # =====================================================
    # EXTRACT FACE EMBEDDING
    # =====================================================

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

        _, _, face_width, face_height = face[:4]
        score = float(face[14])

        if min(face_width, face_height) < 80 or score < 0.8:
            raise FaceProcessingError(
                "low_quality",
                "មុខមិនច្បាស់គ្រប់គ្រាន់ សូមថតម្ដងទៀត។",
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
            logger.exception("Face embedding extraction failed")

            raise FaceProcessingError(
                "models_unavailable",
                "មិនអាចបង្កើតទិន្នន័យមុខបានទេ។",
            ) from error

        norm = float(np.linalg.norm(feature))

        if not np.isfinite(norm) or norm == 0:
            raise FaceProcessingError(
                "low_quality",
                "មិនអាចបង្កើតទិន្នន័យមុខបានទេ។",
            )

        normalized = feature / norm

        if not np.all(np.isfinite(normalized)):
            raise FaceProcessingError(
                "low_quality",
                "ទិន្នន័យមុខមិនត្រឹមត្រូវ។",
            )

        return normalized

    # =====================================================
    # ANALYZE CAMERA FRAME
    # =====================================================

    def analyze(self, image_data: bytes) -> FaceAnalysis:
        """
        វិភាគរូបភាពសម្រាប់ Auto Scan។
        មិនកត់ត្រាវត្តមាន និងមិនប្រើ Database។
        """

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

        x, y, face_width, face_height = face[:4]
        score = float(face[14])

        center_x = float(x + face_width / 2)
        center_y = float(y + face_height / 2)

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

    # =====================================================
    # COSINE SIMILARITY
    # =====================================================

    @staticmethod
    def cosine_similarity(
        first: np.ndarray,
        second: np.ndarray,
    ) -> float:

        left = np.asarray(
            first,
            dtype=np.float32,
        ).reshape(-1)

        right = np.asarray(
            second,
            dtype=np.float32,
        ).reshape(-1)

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

    # =====================================================
    # FIND MATCHING STUDENT
    # =====================================================

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

            current = best_by_student.get(student_id)

            if current is None or similarity > current.similarity:
                best_by_student[student_id] = FaceMatch(
                    student_id=int(student_id),
                    similarity=similarity,
                )

        matches = sorted(
            best_by_student.values(),
            key=lambda match: match.similarity,
            reverse=True,
        )

        best = matches[0] if matches else None

        if best is None or best.similarity < threshold:
            return None

        if (
            len(matches) > 1
            and matches[1].similarity >= threshold
            and best.similarity - matches[1].similarity < ambiguity_margin
        ):
            raise FaceProcessingError(
                "ambiguous_match",
                "លទ្ធផលមុខមិនច្បាស់លាស់ សូមស្កេនម្ដងទៀត។",
            )

        return best