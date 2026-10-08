from __future__ import annotations

import hashlib
import urllib.request
from pathlib import Path

MODELS = {
    "face_detection_yunet_2023mar.onnx": (
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4",
    ),
    "face_recognition_sface_2021dec.onnx": (
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79",
    ),
}
KHMER_FONT = (
    "NotoSansKhmer[wdth,wght].ttf",
    "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskhmer/NotoSansKhmer%5Bwdth%2Cwght%5D.ttf",
    "f37a8431a0c5d5ed2f81a767417546aca576a81fb7eff9c924d46aecf828f2ca",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as model_file:
        for chunk in iter(lambda: model_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_models(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for filename, (url, expected_hash) in MODELS.items():
        target = destination / filename
        if target.is_file() and sha256_file(target) == expected_hash:
            print(f"Model verified: {filename}")
            continue
        temporary = target.with_suffix(target.suffix + ".download")
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "student-attendance-khmer/1.0"})
            with urllib.request.urlopen(request, timeout=120) as response, temporary.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            actual_hash = sha256_file(temporary)
            if actual_hash != expected_hash:
                raise RuntimeError(f"SHA-256 មិនត្រូវគ្នាសម្រាប់ {filename}")
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
        print(f"Downloaded and verified: {filename}")


def download_khmer_font(destination: Path) -> None:
    filename, url, expected_hash = KHMER_FONT
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / filename
    if target.is_file() and sha256_file(target) == expected_hash:
        print(f"Khmer font verified: {filename}")
        return
    temporary = target.with_suffix(target.suffix + ".download")
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "student-attendance-khmer/1.0"})
        with urllib.request.urlopen(request, timeout=120) as response, temporary.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if sha256_file(temporary) != expected_hash:
            raise RuntimeError(f"SHA-256 មិនត្រូវគ្នាសម្រាប់ {filename}")
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    print(f"Downloaded and verified Khmer font: {filename}")


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[1]
    download_models(project_root / "models")
    download_khmer_font(project_root / "assets")