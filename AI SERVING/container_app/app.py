# container_app/app.py
"""
Server sandbox generik: mendengarkan Unix socket, terima {model_path, input},
jalankan inference, balikin hasil. Model_path merujuk ke file yang sudah
di-mount read-only ke dalam container (bukan disertakan dalam image).
"""
import socket
import os
import json
import time
import numpy as np
import onnxruntime as ort

SOCKET_PATH = "/sandbox/sock/inference.sock"


def handle_request(request: dict) -> dict:
    start = time.time()
    try:
        model_path = request["model_path"]
        input_data = request["input"]

        session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name

        arr = np.array(input_data, dtype=np.float32)
        outputs = session.run([output_name], {input_name: arr})

        return {
            "success": True,
            "prediction": outputs[0].tolist(),
            "processing_time_ms": int((time.time() - start) * 1000),
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "processing_time_ms": int((time.time() - start) * 1000),
        }


def main():
    os.makedirs(os.path.dirname(SOCKET_PATH), exist_ok=True)
    if os.path.exists(SOCKET_PATH):
        os.remove(SOCKET_PATH)

    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.bind(SOCKET_PATH)
    server.listen(5)
    print(f"[sandbox] Mendengarkan di {SOCKET_PATH}", flush=True)

    while True:
        conn, _ = server.accept()
        try:
            data = b""
            while True:
                chunk = conn.recv(4096)
                if not chunk:
                    break
                data += chunk
                if data.endswith(b"\n"):
                    break
            request = json.loads(data.decode().strip())
            response = handle_request(request)
            conn.sendall((json.dumps(response) + "\n").encode())
        except Exception as e:
            conn.sendall((json.dumps({"success": False, "message": f"Socket error: {e}"}) + "\n").encode())
        finally:
            conn.close()


if __name__ == "__main__":
    main()