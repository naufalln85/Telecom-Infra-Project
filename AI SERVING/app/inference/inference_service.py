from app.external.core_backend_client_mock import get_account_tier, validate_channel
from app.db.result_service import save_result
from app.registry.registry_service import get_model_by_id
from app.sandbox.sandbox_service import run_in_sandbox
from pathlib import Path

def predict(model_id, input_data, project_id=None, device_id=None, channel_id=None):
    tier = "free"
    if project_id is not None:
        tier = get_account_tier(project_id)

        if device_id is not None and channel_id is not None:
            channel_check = validate_channel(project_id, device_id, channel_id)
            if not channel_check["valid"]:
                return {
                    "success": False,
                    "message": f"Channel {channel_id} tidak valid untuk device {device_id} di project {project_id}"
                }
    model = get_model_by_id(model_id)
    if model is None:
        return {
            "success": False,
            "message": "Model tidak ditemukan"
        }

    # Registry records created on Windows may contain backslashes.  Normalize
    # them so the same model registry works inside the Linux containers.
    model_path = Path(str(model["path"]).replace("\\", "/"))
    if not model_path.is_file():
        return {
            "success": False,
            "model_id": model_id,
            "message": "File model tidak tersedia di volume AI Serving."
        }

    expected_shape = None
    expected_type  = None

    try:
        # Import di dalam fungsi agar tidak crash jika library belum terinstall
        try:
            import onnxruntime as ort
            import numpy as np
        except ImportError as e:
            return {
                "success": False,
                "model_id": model_id,
                "message": f"Library tidak tersedia: {e}. Jalankan: pip install onnxruntime numpy"
            }

        session = ort.InferenceSession(str(model_path))

        input_name     = session.get_inputs()[0].name
        output_name    = session.get_outputs()[0].name
        expected_shape = session.get_inputs()[0].shape
        expected_type  = session.get_inputs()[0].type

        print("INPUT NAME     :", input_name)
        print("EXPECTED SHAPE :", expected_shape)
        print("EXPECTED TYPE  :", expected_type)

        # ── Auto-reshape input ──────────────────────────────────────────────
        # Flatten input apapun bentuknya menjadi 1D array terlebih dahulu
        flat = np.array(input_data, dtype=np.float32).flatten()

        # Hitung shape yang sesungguhnya (ganti dim dinamis / None / negatif → 1, atau hitung jika ada satu dim dinamis)
        dynamic_dims = [i for i, dim in enumerate(expected_shape) if dim is None or isinstance(dim, str) or (isinstance(dim, int) and dim < 0)]
        processed_shape = []
        if len(dynamic_dims) == 1:
            other_prod = 1
            for i, dim in enumerate(expected_shape):
                if i not in dynamic_dims:
                    other_prod *= int(dim)
            dynamic_size = max(1, flat.size // other_prod)
            for i, dim in enumerate(expected_shape):
                if i in dynamic_dims:
                    processed_shape.append(dynamic_size)
                else:
                    processed_shape.append(int(dim))
        else:
            for dim in expected_shape:
                if dim is None or isinstance(dim, str) or (isinstance(dim, int) and dim < 0):
                    processed_shape.append(1)
                else:
                    processed_shape.append(int(dim))

        total_elements = int(np.prod(processed_shape))

        # Pad dengan 0.0 jika kurang, potong jika lebih
        if flat.size < total_elements:
            flat = np.concatenate([flat, np.zeros(total_elements - flat.size, dtype=np.float32)])
            print(f"[PREDICT] Input dipad dari {flat.size - (total_elements - flat.size)} → {total_elements} elemen")
        else:
            flat = flat[:total_elements]

        reshaped_input = flat.reshape(processed_shape)
        print(f"[PREDICT] Input di-reshape ke: {reshaped_input.shape}")
        # ───────────────────────────────────────────────────────────────────

        prediction = run_in_sandbox(
            str(model_path),
            input_name,
            output_name,
            reshaped_input.tolist()   # kirim sebagai nested list ke sandbox
        )

        result = {
            "success":        True,
            "model_id":       model_id,
            "input_shape":    list(reshaped_input.shape),
            "prediction":     prediction[0]
        }
        save_result(model_id, result)
        return result

    except Exception as e:
        result = {
            "success":              False,
            "model_id":             model_id,
            "message":              str(e),
            "expected_input_shape": expected_shape,
            "expected_input_type":  expected_type
        }
        save_result(model_id, result)
        return result
