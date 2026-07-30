from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.inference.inference_service import predict

router = APIRouter()


class PredictRequest(BaseModel):
    model_id: str
    input: list
    project_id: Optional[int] = None
    device_id: Optional[int] = None
    channel_id: Optional[int] = None


@router.post("/predict")
def run_prediction(request: PredictRequest):
    return predict(
        request.model_id,
        request.input,
        request.project_id,
        request.device_id,
        request.channel_id,
    )
