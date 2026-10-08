from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from uuid import uuid4

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": (".jpg", lambda data: data.startswith(b"\xff\xd8\xff")),
    "image/png": (".png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/webp": (".webp", lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP"),
}


def store_image(data: bytes, content_type: str, destination: Path, max_bytes: int) -> str:
    image_type = ALLOWED_IMAGE_TYPES.get(content_type)
    if image_type is None or len(data) > max_bytes or not image_type[1](data):
        raise ValueError("ឯកសាររូបភាពមិនត្រឹមត្រូវ ឬមានទំហំលើសកំណត់។")

    destination.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{image_type[0]}"
    target = destination / filename
    target.write_bytes(data)
    return filename


def remove_stored_file(root: Path, relative_path: str | None) -> None:
    if not relative_path:
        return
    root_path = root.resolve()
    target = (root_path / relative_path).resolve()
    if target.is_relative_to(root_path) and target.is_file():
        target.unlink()


def write_json_atomically(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            json.dump(payload, temporary, ensure_ascii=False, indent=2)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_name = temporary.name
        os.replace(temporary_name, path)
    finally:
        if temporary_name and os.path.exists(temporary_name):
            os.unlink(temporary_name)


def read_json_object(path: Path, default: dict[str, object]) -> dict[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default.copy()
    except (json.JSONDecodeError, OSError) as error:
        raise ValueError("ឯកសារការកំណត់មិនអាចអានបានទេ។") from error
    if not isinstance(payload, dict):
        raise ValueError("ទម្រង់ឯកសារការកំណត់មិនត្រឹមត្រូវទេ។")
    return payload