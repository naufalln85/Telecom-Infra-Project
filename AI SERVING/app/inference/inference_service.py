from app.registry.registry_service import get_model_by_id
from app.sandbox.sandbox_service import run_in_sandbox


def predict(model_id, input_data):

    model = get_model_by_id(model_id)
    if model is None:
        return {
            "success": False,
            "message": "Model tidak ditemukan"
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

        session = ort.InferenceSession(model["path"])

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
            model["path"],
            input_name,
            output_name,
            reshaped_input.tolist()   # kirim sebagai nested list ke sandbox
        )

        return {
            "success":        True,
            "model_id":       model_id,
            "input_shape":    list(reshaped_input.shape),
            "prediction":     prediction[0].tolist()
        }

    except Exception as e:
        return {
            "success":              False,
            "model_id":             model_id,
            "message":              str(e),
            "expected_input_shape": expected_shape,
            "expected_input_type":  expected_type
        }