from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.db.models import Alert, AlertStatus, Analysis, Feedback, FeedbackDecision, Media, Post, User
from app.db.session import get_db
from app.schemas import AlertDetail, AlertPatchRequest, AlertSummary, FeedbackRequest

router = APIRouter(prefix="/alerts", tags=["alerts"])
settings = get_settings()


def _to_storage_url(path: str) -> str:
    if not path:
        return path
    media_root = settings.media_root.rstrip("/")
    if path.startswith(media_root):
        rel = path[len(media_root) :].lstrip("/")
        return f"/storage/{rel}"
    return path


@router.get("", response_model=list[AlertSummary])
def list_alerts(
    status_filter: str | None = Query(default=None, alias="status"),
    category: str | None = None,
    severity: str | None = None,
    q: str | None = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    offset = max(0, (page - 1) * limit)
    query = db.query(Alert, Analysis).join(Analysis, Analysis.id == Alert.analysis_id)
    if status_filter:
        try:
            query = query.filter(Alert.status == AlertStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    if category:
        query = query.filter(Analysis.category == category)
    if severity:
        query = query.filter(Analysis.severity == severity)
    if q:
        query = query.join(Post, Post.id == Alert.post_id).filter(
            or_(Post.text.ilike(f"%{q}%"), Post.author.ilike(f"%{q}%"), Post.platform.ilike(f"%{q}%"))
        )

    rows = query.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()
    return [
        AlertSummary(
            id=alert.id,
            post_id=alert.post_id,
            category=analysis.category,
            severity=analysis.severity,
            fusion_score=analysis.fusion_score,
            status=alert.status.value,
            created_at=alert.created_at,
        )
        for alert, analysis in rows
    ]


@router.delete("")
def delete_alerts_by_status(
    status_filter: str = Query(..., alias="status", description="Only 'resolved' is supported"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Delete all alerts with the given status and their associated posts, feedback, media, and analyses."""
    if status_filter != "resolved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only status=resolved can be deleted; use this to clear resolved cases.",
        )
    resolved = db.query(Alert).filter(Alert.status == AlertStatus.RESOLVED).all()
    if not resolved:
        return {"ok": True, "deleted": 0, "message": "No resolved alerts to delete"}
    post_ids = list({a.post_id for a in resolved})
    alert_ids = [a.id for a in resolved]
    for aid in alert_ids:
        db.query(Feedback).filter(Feedback.alert_id == aid).delete(synchronize_session=False)
    db.query(Alert).filter(Alert.id.in_(alert_ids)).delete(synchronize_session=False)
    db.query(Media).filter(Media.post_id.in_(post_ids)).delete(synchronize_session=False)
    db.query(Analysis).filter(Analysis.post_id.in_(post_ids)).delete(synchronize_session=False)
    db.query(Post).filter(Post.id.in_(post_ids)).delete(synchronize_session=False)
    db.commit()
    return {"ok": True, "deleted": len(post_ids), "message": f"Removed {len(post_ids)} resolved case(s)"}


@router.get("/{alert_id}", response_model=AlertDetail)
def get_alert(alert_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    row = (
        db.query(Alert, Analysis, Post)
        .join(Analysis, Analysis.id == Alert.analysis_id)
        .join(Post, Post.id == Alert.post_id)
        .filter(Alert.id == alert_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert, analysis, post = row
    media_items = db.query(Media).filter(Media.post_id == post.id).all()
    media_payload = []
    for media in media_items:
        meta = dict(media.meta_json or {})
        evidence_frames = [_to_storage_url(p) for p in meta.get("evidence_frames", [])]
        transcript_path = _to_storage_url(meta.get("transcript_path", ""))
        media_payload.append(
            {
                "id": media.id,
                "type": media.type,
                "path": _to_storage_url(media.path),
                "meta_json": {
                    **meta,
                    "transcript_path": transcript_path,
                    "evidence_frames": evidence_frames,
                },
            }
        )
    return AlertDetail(
        id=alert.id,
        status=alert.status.value,
        assigned_to=alert.assigned_to,
        created_at=alert.created_at,
        updated_at=alert.updated_at,
        post={
            "id": post.id,
            "platform": post.platform,
            "platform_post_id": post.platform_post_id,
            "url": post.url,
            "author": post.author,
            "text": post.text,
            "lang": post.lang,
            "raw_json": post.raw_json,
            "media": media_payload,
        },
        analysis={
            "id": analysis.id,
            "text_probs": analysis.text_probs,
            "video_score": analysis.video_score,
            "audio_probs": analysis.audio_probs,
            "fusion_score": analysis.fusion_score,
            "severity": analysis.severity,
            "category": analysis.category,
            "explanation_json": analysis.explanation_json,
            "model_versions": analysis.model_versions,
        },
    )


@router.patch("/{alert_id}", response_model=AlertSummary)
def patch_alert(
    alert_id: int,
    payload: AlertPatchRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = db.query(Alert, Analysis).join(Analysis, Analysis.id == Alert.analysis_id).filter(Alert.id == alert_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert, analysis = row
    if payload.status is not None:
        try:
            alert.status = AlertStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    if payload.assigned_to is not None:
        alert.assigned_to = payload.assigned_to
    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return AlertSummary(
        id=alert.id,
        post_id=alert.post_id,
        category=analysis.category,
        severity=analysis.severity,
        fusion_score=analysis.fusion_score,
        status=alert.status.value,
        created_at=alert.created_at,
    )


@router.post("/{alert_id}/feedback")
def submit_feedback(
    alert_id: int,
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    try:
        decision = FeedbackDecision(payload.decision)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid decision")

    feedback = Feedback(
        alert_id=alert.id,
        user_id=current_user.id,
        decision=decision,
        corrected_category=payload.corrected_category,
        notes=payload.notes,
    )
    db.add(feedback)
    db.commit()
    return {"ok": True, "feedback_id": feedback.id}
