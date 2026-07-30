import socket
import json
import time
import traceback
import numpy as np
import onnxruntime as ort

HOST = "0.0.0.0"
PORT = 9000


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
        print(f"[sandbox] ERROR: {e}", flush=True)
        traceback.print_exc()
        return {"success": False, "message": str(e), "processing_time_ms": int((time.time() - start) * 1000)}


def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print(f"[sandbox] Mendengarkan di {HOST}:{PORT}", flush=True)

    while True:
        try:
            conn, addr = server.accept()
        except Exception as e:
            print(f"[sandbox] ERROR accept: {e}", flush=True)
            continue
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
            print(f"[sandbox] ERROR proses koneksi: {e}", flush=True)
            traceback.print_exc()
        finally:
            conn.close()


if __name__ == "__main__":
    main()
