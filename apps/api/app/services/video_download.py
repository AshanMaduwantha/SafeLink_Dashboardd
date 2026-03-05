"""Download video from YouTube for analysis."""
import shutil
from pathlib import Path
from typing import Optional

from app.core.config import get_settings


def copy_to_post_storage(src_path: str, post_id: int) -> str:
    """Move a file into media_root/post_{post_id}/ and return the destination path (avoids duplicate storage)."""
    settings = get_settings()
    src = Path(src_path)
    if not src.exists():
        return src_path
    out_dir = Path(settings.media_root) / f"post_{post_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / src.name
    shutil.move(str(src), str(dst))
    return str(dst)


def download_video_for_post(url: str, post_id: int) -> Optional[str]:
    """
    Download video from URL (YouTube, etc.) to a temp path.
    Returns the path to the downloaded file, or None if download failed.
    """
    if not url or not url.strip().startswith("http"):
        return None
    try:
        import yt_dlp
    except ImportError:
        return None
    settings = get_settings()
    out_dir = Path(settings.media_root) / "_downloads"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_tmpl = str(out_dir / f"post_{post_id}.%(ext)s")
    opts = {
        "format": "best[ext=mp4]/best[ext=webm]/best",
        "outtmpl": out_tmpl,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "max_download_time": 300,
        "retries": 2,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if not info:
                return None
            # yt-dlp may use different template; find the downloaded file
            requested = info.get("requested_downloads") or []
            if requested:
                path = requested[0].get("filepath")
                if path and Path(path).exists():
                    return path
            # Fallback: expected path from outtmpl (ext from info)
            ext = info.get("ext") or "mp4"
            expected = out_dir / f"post_{post_id}.{ext}"
            if expected.exists():
                return str(expected)
            # List dir for any post_{id}.*
            for f in out_dir.glob(f"post_{post_id}.*"):
                return str(f)
    except Exception:
        return None
    return None
