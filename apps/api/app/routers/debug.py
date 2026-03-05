from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import get_settings
from app.core.deps import require_roles
from app.db.models import User, UserRole
from app.schemas import DebugModelCheckRequest
from app.services.language import detect_lang
from app.services.text_model import get_text_model
from app.services.video_model import get_video_model
from app.services.audio_model import AudioModel

router = APIRouter(prefix="/debug", tags=["debug"])
settings = get_settings()


def _resolve_local_path(path_str: str) -> Path:
    path = Path(path_str)
    if not path.is_absolute():
        path = (Path(settings.demo_input_dir) / path_str).resolve()
    else:
        path = path.resolve()

    allowed_roots = [
        Path(settings.demo_input_dir).resolve(),
        Path(settings.media_root).resolve(),
        Path("/app/models").resolve(),
    ]
    if not any(str(path).startswith(str(root)) for root in allowed_roots):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="video_path must be under demo_input_dir, media_root, or /app/models",
        )
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="video_path does not exist")
    return path


@router.post("/model-check")
def model_check(
    payload: DebugModelCheckRequest,
    _: User = Depends(require_roles([UserRole.ADMIN])),
):
    text = payload.text or ""
    lang = payload.lang or detect_lang(text)
    text_probs = get_text_model().predict(text, lang)

    response = {
        "text": {
            "lang": lang,
            "text_probs": text_probs,
            "model_path": settings.nlp_model_path,
            "adapter_path": settings.nlp_adapter_path,
        },
        "video": None,
        "audio": None,
    }

    if payload.video_path:
        video_path = _resolve_local_path(payload.video_path)
        with TemporaryDirectory(prefix="model_check_") as tmp_dir:
            video_result = get_video_model().analyze(str(video_path), str(Path(tmp_dir) / "frames"))
            response["video"] = video_result
            if payload.run_audio:
                audio_result = AudioModel().analyze_video_audio(str(video_path), str(Path(tmp_dir) / "audio"))
                response["audio"] = {
                    "transcript": audio_result.get("transcript", ""),
                    "audio_probs": audio_result.get("audio_probs", {}),
                }

    return response
