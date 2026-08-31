# app/sandbox/sandbox_service.py
import socket
import json
import os

SANDBOX_HOST = os.getenv("SANDBOX_HOST", "ai-sandbox")
SANDBOX_PORT = int(os.getenv("SANDBOX_PORT", "9000"))


def run_in_sandbox(model_path, input_name, output_name, input_data):
    filename = os.path.basename(str(model_path).replace("\\", "/"))
    model_path_in_container = f"/sandbox/models/{filename}"

    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.settimeout(10)
    try:
        client.connect((SANDBOX_HOST, SANDBOX_PORT))
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

        return [response["prediction"]]
    except socket.timeout:
        raise RuntimeError("Timeout menghubungi sandbox lewat TCP socket.")
    except OSError as exc:
        raise RuntimeError(f"Sandbox tidak dapat dihubungi: {exc}") from exc
    finally:
        client.close()
