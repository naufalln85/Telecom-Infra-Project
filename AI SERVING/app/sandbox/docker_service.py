# app/sandbox/docker_service.py
import subprocess


def run_command(command_list: list):
    """
    Menjalankan command sebagai LIST argumen (bukan string tunggal),
    supaya tidak rentan shell/command injection dari input yang
    berasal dari data user (nama file, path, dsb).
    """
    try:
        result = subprocess.run(
            command_list,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            return True, result.stdout.strip()
        return False, result.stderr.strip()
    except Exception as e:
        return False, str(e)