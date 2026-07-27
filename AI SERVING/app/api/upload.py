from fastapi import APIRouter, UploadFile, File

from app.services.model_service import save_and_validate_model

router = APIRouter()


@router.post("/upload-model")
def upload_model(file: UploadFile = File(...)):

    result = save_and_validate_model(file)

    if not result["success"]:

        return {
            "status": "failed",
            "validation": "blocked",
            "errors": result["errors"]
        }

    return {
        "status": "success",
        "validation": "passed",
        "model": result["model"],
        "operators": result["operators"]
    }