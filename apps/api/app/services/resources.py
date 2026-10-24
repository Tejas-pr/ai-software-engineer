# apps/api/app/services/resources.py
"""System hardware inspection, telemetry detection (CPU/RAM/GPU/Storage),
Ollama daemon metrics, and workspace storage maintenance."""

import os
import platform
import shutil
from typing import Any

import httpx
from sqlmodel import Session, select

from app.config import settings
from app.models.user_resource_limit import UserResourceLimit


def get_system_telemetry() -> dict[str, Any]:
    """Inspects the host machine hardware capabilities."""
    cpu_cores = os.cpu_count() or 1
    cpu_arch = platform.machine()
    os_name = f"{platform.system()} {platform.release()}"

    # Total physical RAM
    total_ram_gb: float | None = None
    if hasattr(os, "sysconf"):
        try:
            pages = os.sysconf("SC_PHYS_PAGES")
            page_size = os.sysconf("SC_PAGE_SIZE")
            total_ram_gb = round((pages * page_size) / (1024**3), 1)
        except (ValueError, OSError):
            pass

    # Accelerator detection (Apple Silicon Metal vs CUDA vs CPU)
    accelerator = "CPU (No accelerator detected)"
    if platform.system() == "Darwin" and platform.machine() in ("arm64", "aarch64"):
        accelerator = "Apple Silicon Unified Memory (Metal MPS)"
    elif os.path.exists("/usr/local/cuda") or shutil.which("nvidia-smi"):
        accelerator = "NVIDIA CUDA Hardware Acceleration"

    # Workspaces storage usage
    workspaces_path = os.path.abspath(settings.WORKSPACES_ROOT)
    os.makedirs(workspaces_path, exist_ok=True)
    disk = shutil.disk_usage(workspaces_path)
    disk_total_gb = round(disk.total / (1024**3), 1)
    disk_free_gb = round(disk.free / (1024**3), 1)

    workspaces_bytes = 0
    try:
        for root, _, files in os.walk(workspaces_path):
            for f in files:
                fp = os.path.join(root, f)
                if not os.path.islink(fp) and os.path.exists(fp):
                    workspaces_bytes += os.path.getsize(fp)
    except OSError:
        pass

    workspaces_size_mb = round(workspaces_bytes / (1024**2), 2)

    return {
        "cpu_cores": cpu_cores,
        "cpu_arch": cpu_arch,
        "platform": os_name,
        "total_ram_gb": total_ram_gb,
        "accelerator": accelerator,
        "disk_total_gb": disk_total_gb,
        "disk_free_gb": disk_free_gb,
        "workspaces_size_mb": workspaces_size_mb,
    }


def get_ollama_hardware_info() -> dict[str, Any]:
    """Queries the local Ollama daemon for version and active VRAM loaded models."""
    reachable = False
    version: str | None = None
    running_models: list[dict[str, Any]] = []

    try:
        with httpx.Client(base_url=settings.OLLAMA_BASE_URL, timeout=1.5) as client:
            v_res = client.get("/api/version")
            if v_res.is_success:
                reachable = True
                version = v_res.json().get("version")

            ps_res = client.get("/api/ps")
            if ps_res.is_success:
                for m in ps_res.json().get("models", []):
                    running_models.append(
                        {
                            "name": m.get("name") or m.get("model"),
                            "size_vram_gb": round(m.get("size_vram", 0) / (1024**3), 2),
                            "expires_at": m.get("expires_at"),
                        }
                    )
    except (httpx.HTTPError, OSError):
        pass

    return {
        "reachable": reachable,
        "version": version,
        "base_url": settings.OLLAMA_BASE_URL,
        "running_models": running_models,
    }


def get_or_create_user_resource_limits(
    session: Session, user_id: int
) -> UserResourceLimit:
    """Fetches user resource limits or initializes default row."""
    limit = session.exec(
        select(UserResourceLimit).where(UserResourceLimit.user_id == user_id)
    ).first()
    if limit is None:
        limit = UserResourceLimit(user_id=user_id)
        session.add(limit)
        session.commit()
        session.refresh(limit)
    return limit


def prune_workspaces_storage() -> dict[str, float]:
    """Prunes temporary files in workspaces directory to reclaim storage."""
    workspaces_path = os.path.abspath(settings.WORKSPACES_ROOT)
    os.makedirs(workspaces_path, exist_ok=True)

    bytes_freed = 0
    try:
        # Walk and remove dangling cache/diff files or empty directories
        for root, dirs, files in os.walk(workspaces_path, topdown=False):
            for name in files:
                if name.endswith((".patch", ".diff", ".tmp", ".log")):
                    file_path = os.path.join(root, name)
                    try:
                        sz = os.path.getsize(file_path)
                        os.remove(file_path)
                        bytes_freed += sz
                    except OSError:
                        pass
    except OSError:
        pass

    # Recalculate remaining
    workspaces_bytes = 0
    try:
        for root, _, files in os.walk(workspaces_path):
            for f in files:
                fp = os.path.join(root, f)
                if not os.path.islink(fp) and os.path.exists(fp):
                    workspaces_bytes += os.path.getsize(fp)
    except OSError:
        pass

    return {
        "freed_mb": round(bytes_freed / (1024**2), 2),
        "workspaces_size_mb": round(workspaces_bytes / (1024**2), 2),
    }
