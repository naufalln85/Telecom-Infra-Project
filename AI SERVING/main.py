from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.upload import router as upload_router
from app.api.models import router as model_router
from app.api.predict import router as predict_router

app = FastAPI(
    title="AI Serving",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(model_router)
app.include_router(predict_router)

@app.get("/")
def root():
    return {
        "message": "AI Serving Running 🚀"
    }