import json
import uuid
from datetime import datetime
from pathlib import Path

REGISTRY_FILE = Path(__file__).resolve().parents[2] / "data" / "registry.json"


def register_model(filename, path):

    REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not REGISTRY_FILE.exists():
        with REGISTRY_FILE.open("w", encoding="utf-8") as f:
            json.dump([], f)

    with REGISTRY_FILE.open("r", encoding="utf-8") as f:
        models = json.load(f)

    model = {
        "id": str(uuid.uuid4())[:8],
        "filename": filename,
        "path": Path(path).as_posix(),
        "status": "ready",
        "uploaded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    models.append(model)

    with REGISTRY_FILE.open("w", encoding="utf-8") as f:
        json.dump(models, f, indent=4)

    return model

def get_all_models():

    if not REGISTRY_FILE.exists():
        return []

    with REGISTRY_FILE.open("r", encoding="utf-8") as f:
        models = json.load(f)

    return models

def get_model_by_id(model_id):

    if not REGISTRY_FILE.exists():
        return None
    with REGISTRY_FILE.open("r", encoding="utf-8") as f:
        models = json.load(f)

    for model in models:
        if model["id"] == model_id:
            return model

    return None
