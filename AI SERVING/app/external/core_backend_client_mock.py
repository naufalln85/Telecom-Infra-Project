# app/external/core_backend_client_mock.py
"""
Versi mock -- dipakai SEMENTARA sebelum database Mahasiswa A siap diakses.
Ganti import ke core_backend_client.py (versi asli) begitu sudah bisa konek.
"""

def get_account_tier(project_id) -> str:
    return "free"


def validate_channel(project_id, device_id, channel_id) -> dict:
    return {"valid": True, "channel_id": channel_id, "channel_type": "image"}
