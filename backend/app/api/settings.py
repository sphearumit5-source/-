from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, require_roles
from app.schemas.settings import SchoolSettings
from app.utils.helpers import read_json_object, remove_stored_file, store_image, write_json_atomically

router = APIRouter(prefix="/api/settings", tags=["ការកំណត់"])


@router.get("", response_model=SchoolSettings)
def read_settings(_: CurrentUser) -> SchoolSettings:
    configuration = get_settings()
    defaults = SchoolSettings(late_after_time=configuration.late_after_time)
    try:
        values = read_json_object(configuration.school_settings_file, defaults.model_dump(mode="json"))
        return SchoolSettings.model_validate(values)
    except (ValueError, OSError) as error:
        raise HTTPException(status_code=500, detail="មិនអាចអានការកំណត់សាលាបានទេ។") from error


@router.put("", response_model=SchoolSettings)
def update_settings(
    payload: SchoolSettings,
    _: CurrentUser = require_roles("admin"),
) -> SchoolSettings:
    try:
        write_json_atomically(get_settings().school_settings_file, payload.model_dump(mode="json"))
    except OSError as error:
        raise HTTPException(status_code=500, detail="មិនអាចរក្សាទុកការកំណត់បានទេ។") from error
    return payload


@router.post("/logo", response_model=SchoolSettings)
async def upload_school_logo(
    _: CurrentUser = require_roles("admin"),
    image: UploadFile = File(...),
) -> SchoolSettings:
    configuration = get_settings()
    content = await image.read(configuration.max_upload_bytes + 1)
    try:
        filename = store_image(
            content,
            image.content_type or "",
            configuration.uploads_directory / "school",
            configuration.max_upload_bytes,
        )
        current = SchoolSettings.model_validate(
            read_json_object(configuration.school_settings_file, SchoolSettings().model_dump(mode="json"))
        )
        updated = current.model_copy(update={"logo_path": f"school/{filename}"})
        write_json_atomically(configuration.school_settings_file, updated.model_dump(mode="json"))
    except ValueError as error:
        raise HTTPException(status_code=415, detail=str(error)) from error
    except OSError as error:
        raise HTTPException(status_code=500, detail="មិនអាចរក្សាទុក Logo បានទេ។") from error
    if current.logo_path:
        remove_stored_file(configuration.uploads_directory, current.logo_path)
    return updated


@router.get("/logo")
def get_school_logo(_: CurrentUser) -> FileResponse:
    configuration = get_settings()
    values = read_json_object(
        configuration.school_settings_file,
        SchoolSettings().model_dump(mode="json"),
    )
    logo_path = values.get("logo_path")
    if not isinstance(logo_path, str):
        raise HTTPException(status_code=404, detail="មិនទាន់មាន Logo សាលាទេ។")
    root = (configuration.uploads_directory / "school").resolve()
    target = (configuration.uploads_directory / logo_path).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise HTTPException(status_code=404, detail="រកមិនឃើញ Logo សាលាទេ។")
    return FileResponse(target)