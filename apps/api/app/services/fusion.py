from dataclasses import dataclass
from typing import Dict, List

from app.core.config import get_settings
from app.services.constants import CATEGORIES


@dataclass
class FusionResult:
    category: str
    severity: str
    risk_score: float
    explanation: List[str]


def _severity(score: float) -> str:
    if score > 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 40:
        return "MED"
    return "LOW"


def fuse_scores(
    text_probs: Dict[str, float],
    video_score: float,
    audio_probs: Dict[str, float],
    keyword_hits: List[str],
    has_video_input: bool = False,
    has_audio_input: bool = False,
) -> FusionResult:
    settings = get_settings()

    text_top = max(text_probs.items(), key=lambda item: item[1])[0] if text_probs else "general_violence"
    text_score = text_probs.get(text_top, 0.0)

    audio_top = max(audio_probs.items(), key=lambda item: item[1])[0] if audio_probs else text_top
    audio_score = audio_probs.get(audio_top, 0.0)

    active_modalities = [("text", settings.fusion_text_w, text_score)]
    if has_video_input:
        active_modalities.append(("video", settings.fusion_video_w, video_score))
    if has_audio_input:
        active_modalities.append(("audio", settings.fusion_audio_w, audio_score))

    total_weight = sum(weight for _, weight, _ in active_modalities) or 1.0
    normalized = [(name, weight / total_weight, score) for name, weight, score in active_modalities]
    weighted = sum(weight * score for _, weight, score in normalized)
    bonus = min(0.1, len(keyword_hits) * 0.02)
    final_score = min(1.0, weighted + bonus)
    risk_score = final_score * 100

    category_votes = {c: 0.0 for c in CATEGORIES}
    norm_text_w = next((w for name, w, _ in normalized if name == "text"), 0.0)
    norm_video_w = next((w for name, w, _ in normalized if name == "video"), 0.0)
    norm_audio_w = next((w for name, w, _ in normalized if name == "audio"), 0.0)
    for category, prob in text_probs.items():
        category_votes[category] += prob * norm_text_w
    for category, prob in audio_probs.items():
        category_votes[category] += prob * norm_audio_w
    category_votes[text_top] += norm_video_w * video_score
    category = max(category_votes.items(), key=lambda item: item[1])[0]

    explanation = []
    if keyword_hits:
        explanation.append(f"keyword_hits={keyword_hits[:5]}")
    explanation.append(f"text_top={text_top}:{text_score:.2f}")
    explanation.append(f"video_score={video_score:.2f}")
    explanation.append(f"audio_top={audio_top}:{audio_score:.2f}")
    explanation.append(
        f"normalized_weights=text:{norm_text_w:.2f},video:{norm_video_w:.2f},audio:{norm_audio_w:.2f}"
    )

    return FusionResult(category=category, severity=_severity(risk_score), risk_score=risk_score, explanation=explanation)
