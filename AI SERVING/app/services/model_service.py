# app/services/model_service.py
import os
import shutil

from app.registry.registry_service import register_model
from validator.onnx_operator_validator import validate_model
from app.sandbox.deploy_service import ensure_sandbox_running

TEMP_FOLDER = "temp_uploads"
UPLOAD_FOLDER = "uploads"

os.makedirs(TEMP_FOLDER, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def save_and_validate_model(file):
    temp_path = os.path.join(TEMP_FOLDER, file.filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = validate_model(temp_path)

    if not result.ok:
        os.remove(temp_path)
        return {"success": False, "errors": result.errors}

    final_path = os.path.join(UPLOAD_FOLDER, file.filename)
    shutil.move(temp_path, final_path)

    model_info = register_model(filename=file.filename, path=final_path)
    sandbox_status = ensure_sandbox_running()

    return {
        "success": True,
        "model": model_info,
        "sandbox": sandbox_status,
        "operators": sorted(result.operators_used),
    }