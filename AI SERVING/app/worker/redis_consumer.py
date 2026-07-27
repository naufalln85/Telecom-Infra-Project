"""
redis_consumer.py
==================
Modul: AI Serving & Sandbox — IoT Platform (Non-Skripsi)
Mahasiswa D

Worker background yang berjalan sebagai proses terpisah.
Mengonsumsi event telemetri dari Redis Streams (event-bus-stream),
menjalankan inferensi via sandbox atau external API,
lalu mempublish hasil ke Redis Stream (ai-results-stream).

Cara jalankan:
    python -m app.worker.redis_consumer

Catatan: Worker ini TERPISAH dari server FastAPI.
FastAPI menangani upload & predict on-demand.
Worker ini menangani pipeline inferensi real-time dari sensor IoT.
"""

import json
import os
import sys
import time

# ─── Konfigurasi Redis ────────────────────────────────────────────────────────
REDIS_HOST       = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT       = int(os.getenv("REDIS_PORT", 6379))
REDIS_STREAM_IN  = "event-bus-stream"       # Stream masuk dari Gateway/Sensor
REDIS_STREAM_OUT = "ai-results-stream"      # Stream keluar ke WebSocket/Dashboard
REDIS_GROUP_NAME = "ai-inference-group"
REDIS_CONSUMER   = "fastapi-worker-01"


def get_redis_client():
    """Membuat koneksi Redis dengan graceful error message."""
    try:
        import redis
        client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=0,
            decode_responses=True
        )
        client.ping()  # Uji koneksi aktif
        return client
    except ImportError:
        print("[WORKER] ERROR: Pustaka 'redis' tidak terinstall.")
        print("         Jalankan: pip install redis")
        sys.exit(1)
    except Exception as e:
        print(f"[WORKER] ERROR: Gagal terhubung ke Redis ({REDIS_HOST}:{REDIS_PORT}): {e}")
        sys.exit(1)


def ensure_consumer_group(client):
    """Membuat consumer group jika belum ada."""
    try:
        client.xgroup_create(REDIS_STREAM_IN, REDIS_GROUP_NAME, id="0", mkstream=True)
        print(f"[WORKER] Consumer group '{REDIS_GROUP_NAME}' berhasil dibuat.")
    except Exception as e:
        if "already exists" in str(e):
            print(f"[WORKER] Consumer group '{REDIS_GROUP_NAME}' sudah ada. Melanjutkan...")
        else:
            raise e


def run_inference(event_data: dict) -> dict:
    """
    Menentukan mode serving dan menjalankan inferensi.
    Dua mode:
      - 'sandbox'      : jalankan model ONNX lokal via onnxruntime
      - 'external_api' : kirim HTTP POST ke endpoint AI user
    """
    from app.inference.inference_service import predict
    from app.registry.registry_service import get_model_by_id

    serving_mode = event_data.get("ai_serving_mode", "sandbox")
    model_id     = event_data.get("model_id")

    if serving_mode == "sandbox":
        if not model_id:
            return {"status": "error", "message": "Field 'model_id' wajib untuk mode sandbox."}
        return predict(model_id, event_data.get("input", []))

    elif serving_mode == "external_api":
        import hmac
        import hashlib
        import json
        import urllib.request
        import urllib.error

        api_url = event_data.get("external_api_url")
        if not api_url:
            return {"status": "error", "message": "Field 'external_api_url' wajib untuk mode external_api."}

        secret  = os.getenv("PLATFORM_HMAC_SECRET", "iot-platform-secret-key-2024")
        payload = json.dumps(event_data)
        sig     = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

        req = urllib.request.Request(
            api_url,
            data=payload.encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "IoT-Platform-Worker/1.0",
                "X-IoT-Platform-Signature": sig
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return {"status": "error", "message": f"External API error: {e}"}

    else:
        return {"status": "error", "message": f"Mode serving '{serving_mode}' tidak dikenal."}


def publish_result(client, project_id: str, device_id: str, result: dict):
    """Mempublish hasil inferensi ke Redis Stream & Pub/Sub."""
    payload = {
        "project_id": project_id,
        "device_id":  device_id,
        "type":       "AI_INFERENCE_RESULT",
        "status":     result.get("status", "unknown"),
        "payload":    json.dumps(result)
    }
    client.xadd(REDIS_STREAM_OUT, payload)
    client.publish(f"project:{project_id}:alerts", json.dumps(payload))
    print(f"[WORKER] Hasil dipublish ke stream '{REDIS_STREAM_OUT}' dan channel project:{project_id}:alerts")


def run():
    """Loop utama worker — polling Redis Streams secara permanen."""
    print("[WORKER] ======================================================")
    print("[WORKER] AI Serving Redis Consumer Worker - Mahasiswa D")
    print(f"[WORKER] Menghubungi Redis: {REDIS_HOST}:{REDIS_PORT}")
    print("[WORKER] ======================================================")

    client = get_redis_client()
    ensure_consumer_group(client)

    print(f"[WORKER] Polling stream '{REDIS_STREAM_IN}' — group '{REDIS_GROUP_NAME}' — siap!")

    while True:
        try:
            # Baca satu event, block maksimal 1 detik sebelum polling ulang
            events = client.xreadgroup(
                groupname=REDIS_GROUP_NAME,
                consumername=REDIS_CONSUMER,
                streams={REDIS_STREAM_IN: ">"},
                count=1,
                block=1000
            )

            if not events:
                continue

            for _, entries in events:
                for entry_id, entry_data in entries:
                    try:
                        event = json.loads(entry_data.get("payload", "{}"))
                        project_id = event.get("project_id", "unknown")
                        device_id  = event.get("device_id",  "unknown")

                        print(f"[WORKER] Memproses event {entry_id} | project={project_id} device={device_id}")

                        result = run_inference(event)

                        publish_result(client, project_id, device_id, result)

                        # Acknowledge event selesai
                        client.xack(REDIS_STREAM_IN, REDIS_GROUP_NAME, entry_id)
                        print(f"[WORKER] Event {entry_id} selesai diproses: {result.get('status')}")

                    except Exception as e:
                        print(f"[WORKER] ERROR memproses event {entry_id}: {e}")

        except KeyboardInterrupt:
            print("\n[WORKER] Dihentikan oleh pengguna.")
            break
        except Exception as e:
            print(f"[WORKER] Koneksi terputus: {e}. Mencoba ulang dalam 3 detik...")
            time.sleep(3)


if __name__ == "__main__":
    run()
