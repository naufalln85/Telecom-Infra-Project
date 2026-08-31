import os
import socket

SANDBOX_HOST = os.getenv("SANDBOX_HOST", "ai-sandbox")
SANDBOX_PORT = int(os.getenv("SANDBOX_PORT", "9000"))


def ensure_sandbox_running():
    """Verify the Compose-managed sandbox without a privileged Docker socket."""
    try:
        with socket.create_connection((SANDBOX_HOST, SANDBOX_PORT), timeout=2):
            return {"success": True, "message": "Sandbox siap menerima inferensi."}
    except OSError as exc:
        return {"success": False, "message": f"Sandbox tidak dapat dihubungi: {exc}"}
