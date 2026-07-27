# app/sandbox/sandbox_service.py
import socket
import json
import os

SOCKET_PATH = os.path.abspath("sandbox_sock/inference.sock")


def run_in_sandbox(model_path, input_name, output_name, input_data):
    """
    Kirim request inference ke sandbox generik lewat Unix socket.
    model_path di sini harus path ABSOLUT di HOST (misal 'uploads/model_x.onnx'),
    lalu dikonversi ke path DI DALAM container (karena folder uploads di-mount
    ke /sandbox/models).
    """
    filename = os.path.basename(model_path)
    model_path_in_container = f"/sandbox/models/{filename}"

    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client.settimeout(5)
    try:
        client.connect(SOCKET_PATH)
        request = json.dumps({"model_path": model_path_in_container, "input": input_data}) + "\n"
        client.sendall(request.encode())

        data = b""
        while True:
            chunk = client.recv(4096)
            if not chunk:
                break
            data += chunk
            if data.endswith(b"\n"):
                break

        response = json.loads(data.decode().strip())
        if not response.get("success"):
            raise RuntimeError(response.get("message", "Inference gagal di sandbox"))

        # Kembalikan dalam format list mirip [array], supaya kompatibel
        # dengan pemanggil lama yang expect prediction[0]
        return [response["prediction"]]
    except socket.timeout:
        raise RuntimeError("Timeout menghubungi sandbox lewat socket.")
    finally:
        client.close()