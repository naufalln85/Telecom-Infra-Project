# app/sandbox/deploy_service.py
import os
from app.sandbox.docker_service import run_command
from app.sandbox.sandbox_manager import sandbox_manager

SANDBOX_IMAGE = "ai-sandbox:latest"
CONTAINER_NAME = "ai-sandbox-persistent"
MODELS_DIR = "/home/dino4/ai-serving/uploads"
SANDBOX_PORT = 9000


def ensure_sandbox_running():
    if sandbox_manager.is_running():
        return {"success": True, "message": "Sandbox sudah jalan.", "container_id": sandbox_manager.container_id}

    os.makedirs(MODELS_DIR, exist_ok=True)

    check_cmd = ["docker", "inspect", "-f", "{{.State.Running}}", CONTAINER_NAME]
    ok, output = run_command(check_cmd)
    if ok and output.strip() == "true":
        sandbox_manager.set_running(CONTAINER_NAME)
        return {"success": True, "message": "Sandbox sudah jalan dari sebelumnya.", "container_id": CONTAINER_NAME}

    run_command(["docker", "rm", "-f", CONTAINER_NAME])

    docker_cmd = [
        "docker", "run", "-d",
        "--name", CONTAINER_NAME,
        "--runtime=runsc",
        "-p", f"127.0.0.1:{SANDBOX_PORT}:{SANDBOX_PORT}",
        "--cpus=1",
        "--memory=256m",
        "-v", f"{MODELS_DIR}:/sandbox/models:ro",
        SANDBOX_IMAGE,
    ]

    ok, output = run_command(docker_cmd)
    if not ok:
        return {"success": False, "message": output}

    sandbox_manager.set_running(CONTAINER_NAME)
    return {"success": True, "container_id": output}
