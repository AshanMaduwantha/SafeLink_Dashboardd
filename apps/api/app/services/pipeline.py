from datetime import datetime
from pathlib import Path
from typing import Dict, List

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Analysis, Media, Post
from app.services.alerting import maybe_create_alert
from app.services.fusion import fuse_scores
from app.services.keyword_prefilter import KeywordPrefilter
from app.services.language import detect_lang
from app.services.text_model import get_text_model
from app.services.video_model import get_video_model
from app.services.audio_model import AudioModel


def _get_prefilter(settings) -> KeywordPrefilter:
    en_path = str(Path(settings.demo_input_dir).parent / "keywords" / "en.txt")
    si_path = str(Path(settings.demo_input_dir).parent / "keywords" / "si.txt")
    return KeywordPrefilter(en_path=en_path, si_path=si_path)


def run_analysis(db: Session, post: Post) -> Dict:
    settings = get_settings()
    prefilter = _get_prefilter(settings)
    text = post.text or ""
    lang = detect_lang(text)
    post.lang = lang

    matched, keyword_hits = prefilter.match(text)
    if matched:
        text_probs = get_text_model().predict(text, lang)
    else:
        text_probs = {"general_violence": 0.05}

    video_score = 0.0
    audio_probs: Dict[str, float] = {}
    evidence_frames: List[str] = []
    top_detections: List[str] = []
    has_video_input = False
    has_audio_input = False

    media_items = db.query(Media).filter(Media.post_id == post.id).all()
    for media in media_items:
        if media.type == "video":
            has_video_input = True
            post_dir = Path(settings.media_root) / f"post_{post.id}"
            video_result = get_video_model().analyze(media.path, str(post_dir / "frames"))
            video_score = max(video_score, float(video_result.get("video_score", 0.0)))
            evidence_frames.extend(video_result.get("evidence_frames", []))
            top_detections.extend(video_result.get("top_detections", []))
            audio_result = AudioModel().analyze_video_audio(media.path, str(post_dir / "audio"))
            audio_probs = audio_result.get("audio_probs", {})
            has_audio_input = True
            media.meta_json = {
                **(media.meta_json or {}),
                "transcript": audio_result.get("transcript", ""),
                "transcript_path": audio_result.get("transcript_path", ""),
                "evidence_frames": evidence_frames[:12],
                "top_detections": top_detections[:30],
            }

    fusion = fuse_scores(
        text_probs=text_probs,
        video_score=video_score,
        audio_probs=audio_probs,
        keyword_hits=keyword_hits,
        has_video_input=has_video_input,
        has_audio_input=has_audio_input,
    )

    analysis = Analysis(
        post_id=post.id,
        text_probs=text_probs,
        video_score=video_score,
        audio_probs=audio_probs,
        fusion_score=fusion.risk_score,
        severity=fusion.severity,
        category=fusion.category,
        explanation_json=fusion.explanation,
        model_versions={
            "text_model": settings.nlp_model_path,
            "text_adapter": settings.nlp_adapter_path,
            "video_model": settings.yolo_weights_path,
            "audio_model": settings.whisper_model,
        },
        created_at=datetime.utcnow(),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    db.refresh(post)

    alert = maybe_create_alert(db, post, analysis)
    return {"analysis_id": analysis.id, "alert_id": alert.id if alert else None}
