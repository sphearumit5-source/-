import json

import pytest

from app.utils.helpers import read_json_object, remove_stored_file, store_image, write_json_atomically


def test_store_image_validates_content_and_size(tmp_path) -> None:
    jpeg = b"\xff\xd8\xff" + b"test"
    filename = store_image(jpeg, "image/jpeg", tmp_path / "photos", 32)
    assert (tmp_path / "photos" / filename).read_bytes() == jpeg
    with pytest.raises(ValueError):
        store_image(b"not an image", "image/jpeg", tmp_path / "photos", 32)
    with pytest.raises(ValueError):
        store_image(jpeg, "image/jpeg", tmp_path / "photos", 2)


def test_remove_stored_file_cannot_escape_root(tmp_path) -> None:
    secret = tmp_path / "secret.txt"
    secret.write_text("keep", encoding="utf-8")
    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    remove_stored_file(upload_root, "../secret.txt")
    assert secret.read_text(encoding="utf-8") == "keep"


def test_settings_json_is_replaced_atomically(tmp_path) -> None:
    target = tmp_path / "settings.json"
    write_json_atomically(target, {"school_name": "សាលាគំរូ"})
    assert json.loads(target.read_text(encoding="utf-8")) == {"school_name": "សាលាគំរូ"}
    assert read_json_object(target, {}) == {"school_name": "សាលាគំរូ"}
    assert read_json_object(tmp_path / "missing.json", {"late": "08:00"}) == {"late": "08:00"}