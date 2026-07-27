from fastapi import APIRouter
from pydantic import BaseModel

from app.inference.inference_service import predict

router = APIRouter()


class PredictRequest(BaseModel):
    model_id: str
    input: list


@router.post("/predict")
def run_prediction(request: PredictRequest):

    return predict(
        request.model_id,
        request.input
    )