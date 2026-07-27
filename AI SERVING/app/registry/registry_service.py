import json
import os
import uuid
from datetime import datetime

REGISTRY_FILE = "data/registry.json"


def register_model(filename, path):

    if not os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, "w") as f:
            json.dump([], f)

    with open(REGISTRY_FILE, "r") as f:
        models = json.load(f)

    model = {
        "id": str(uuid.uuid4())[:8],
        "filename": filename,
        "path":path,
        "status": "ready",
        "uploaded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    models.append(model)

    with open(REGISTRY_FILE, "w") as f:
        json.dump(models, f, indent=4)

    return model

def get_all_models():

    if not os.path.exists(REGISTRY_FILE):
        return []

    with open(REGISTRY_FILE, "r") as f:
        models = json.load(f)

    return models

def get_model_by_id(model_id):

    with open(REGISTRY_FILE, "r") as f:
        models = json.load(f)

    for model in models:
        if model["id"] == model_id:
            return model

    return None