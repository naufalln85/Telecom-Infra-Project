# app/sandbox/sandbox_manager.py
class SandboxManager:
    """Melacak status SATU sandbox generik yang persistent (bukan per-model)."""

    def __init__(self):
        self.container_id = None
        self.status = "stopped"

    def set_running(self, container_id):
        self.container_id = container_id
        self.status = "running"

    def is_running(self):
        return self.status == "running"


sandbox_manager = SandboxManager()