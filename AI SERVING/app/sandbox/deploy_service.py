# app/sandbox/deploy_service.py
import os
from app.sandbox.docker_service import run_command
from app.sandbox.sandbox_manager import sandbox_manager

SANDBOX_IMAGE = "ai-sandbox:latest"
CONTAINER_NAME = "ai-sandbox-persistent"
SOCK_DIR = os.path.abspath("sandbox_sock")
MODELS_DIR = os.path.abspath("uploads")  # folder yang sudah dipakai model_service.py


def ensure_sandbox_running():
    """Pastikan container sandbox generik sedang jalan. Idempotent -- aman dipanggil berkali-kali."""
    if sandbox_manager.is_running():
        return {"success": True, "message": "Sandbox sudah jalan.", "container_id": sandbox_manager.container_id}

    os.makedirs(SOCK_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Cek dulu apakah container dengan nama ini sudah ada dari sesi sebelumnya
    check_cmd = ["docker", "inspect", "-f", "{{.State.Running}}", CONTAINER_NAME]
    ok, output = run_command(check_cmd)
    if ok and output.strip() == "true":
        sandbox_manager.set_running(CONTAINER_NAME)
        return {"success": True, "message": "Sandbox sudah jalan dari sebelumnya.", "container_id": CONTAINER_NAME}

    # Hapus sisa container mati dengan nama sama (kalau ada)
    run_command(["docker", "rm", "-f", CONTAINER_NAME])

    docker_cmd = [
        "docker", "run", "-d",
        "--name", CONTAINER_NAME,
        "--runtime=runsc",
        "--network=none",
        "--cpus=1",
        "--memory=256m",
        "--read-only",
        "-v", f"{SOCK_DIR}:/sandbox/sock",
        "-v", f"{MODELS_DIR}:/sandbox/models:ro",
        SANDBOX_IMAGE,
    ]

    ok, output = run_command(docker_cmd)
    if not ok:
        return {"success": False, "message": output}

    sandbox_manager.set_running(CONTAINER_NAME)
    return {"success": True, "container_id": output}