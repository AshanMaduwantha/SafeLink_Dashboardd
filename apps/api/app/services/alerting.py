from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Alert, AlertStatus, Analysis, Post
from app.services.event_bus import publish_alert


def maybe_create_alert(db: Session, post: Post, analysis: Analysis) -> Optional[Alert]:
    settings = get_settings()
    if analysis.fusion_score < settings.alert_threshold:
        return None

    alert = Alert(
        post_id=post.id,
        analysis_id=analysis.id,
        status=AlertStatus.NEW,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    publish_alert(alert_summary(alert, analysis))
    return alert


def alert_summary(alert: Alert, analysis: Analysis) -> Dict[str, Any]:
    return {
        "id": alert.id,
        "post_id": alert.post_id,
        "category": analysis.category,
        "severity": analysis.severity,
        "fusion_score": analysis.fusion_score,
        "status": alert.status.value,
        "created_at": alert.created_at.isoformat(),
    }
