from fastapi import APIRouter

from app.registry.registry_service import get_all_models

router = APIRouter()


@router.get("/models")
def list_models():

    return get_all_models()