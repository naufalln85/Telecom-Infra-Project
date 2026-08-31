# app/services/model_service.py
import shutil
import uuid
from pathlib import Path

from app.registry.registry_service import register_model
from validator.onnx_operator_validator import validate_model
from app.sandbox.deploy_service import ensure_sandbox_running

BASE_DIR = Path(__file__).resolve().parents[2]
TEMP_FOLDER = BASE_DIR / "temp_uploads"
UPLOAD_FOLDER = BASE_DIR / "uploads"

TEMP_FOLDER.mkdir(exist_ok=True)
UPLOAD_FOLDER.mkdir(exist_ok=True)


def save_and_validate_model(file):
    original_name = Path(file.filename or "").name
    if not original_name.lower().endswith(".onnx"):
        return {"success": False, "errors": ["Hanya file model .onnx yang dapat diunggah."]}

    stored_name = f"{uuid.uuid4().hex}_{original_name}"
    temp_path = TEMP_FOLDER / stored_name

    with temp_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = validate_model(temp_path)

    if not result.ok:
        temp_path.unlink(missing_ok=True)
        return {"success": False, "errors": result.errors}

    final_path = UPLOAD_FOLDER / stored_name
    shutil.move(temp_path, final_path)

    model_info = register_model(filename=original_name, path=Path("uploads") / stored_name)
    sandbox_status = ensure_sandbox_running()

    return {
        "success": True,
        "model": model_info,
        "sandbox": sandbox_status,
        "operators": sorted(result.operators_used),
    }
