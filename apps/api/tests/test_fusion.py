from app.services.fusion import fuse_scores


def test_fusion_high_risk():
    result = fuse_scores(
        text_probs={"killings_murder_violent_acts": 0.9},
        video_score=0.8,
        audio_probs={"general_violence": 0.6},
        keyword_hits=["kill", "weapon"],
    )
    assert result.risk_score > 70
    assert result.severity in {"HIGH", "CRITICAL"}


def test_fusion_low_risk():
    result = fuse_scores(
        text_probs={"general_violence": 0.1},
        video_score=0.05,
        audio_probs={"general_violence": 0.1},
        keyword_hits=[],
    )
    assert result.risk_score < 30
    assert result.severity == "LOW"
