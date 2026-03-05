from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_optional_user
from app.db.models import Alert, Analysis, Feedback, Media, Post, User
from app.db.session import SessionLocal, get_db
from app.schemas import (
    FacebookStreamStartRequest,
    IngestDemoRequest,
    ReplayStartRequest,
    TwitterStreamStartRequest,
    YouTubeStreamStartRequest,
)
from app.services.ingestion import (
    create_post_and_queue,
    facebook_debug_fetch,
    facebook_polling_status,
    ingest_facebook_once,
    ingest_twitter_once,
    ingest_youtube_hashtag_once,
    ingest_youtube_once,
    poll_youtube_search,
    start_facebook_polling,
    start_replay,
    start_twitter_polling,
    start_youtube_polling,
    stop_facebook_polling,
    stop_replay,
    stop_twitter_polling,
    stop_youtube_polling,
    twitter_debug_search,
    twitter_polling_status,
    youtube_polling_status,
)

router = APIRouter(prefix="/ingest", tags=["ingest"])
settings = get_settings()


@router.get("/status")
def ingest_status(_: User | None = Depends(get_optional_user)):
    """Return which ingest sources are configured (no secrets). Use this to debug why YouTube/Facebook posts are not coming."""
    youtube_ok = bool(settings.youtube_api_key and settings.youtube_api_key.strip())
    facebook_ok = bool(
        settings.facebook_page_access_token
        and settings.facebook_page_access_token.strip()
        and _configured_facebook_pages()
    )
    twitter_ok = bool(settings.twitter_bearer_token and settings.twitter_bearer_token.strip())
    return {
        "youtube_configured": youtube_ok,
        "facebook_configured": facebook_ok,
        "twitter_configured": twitter_ok,
        "facebook_page_count": len(_configured_facebook_pages()) if settings.facebook_page_access_token else 0,
        "hint": "Set YOUTUBE_API_KEY, FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_IDS in .env so 'Fetch new posts' works.",
    }


@router.post("/demo")
def ingest_demo(payload: IngestDemoRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    post = create_post_and_queue(
        db=db,
        platform=payload.platform,
        platform_post_id=payload.platform_post_id,
        text=payload.text or "",
        author=payload.author or "demo_user",
        url=payload.url or "",
        raw_json=payload.raw_json,
        media_paths=payload.media_paths,
    )
    return {"ok": True, "post_id": post.id}


@router.post("/demo/upload")
async def ingest_demo_upload(json_file: UploadFile, media_file: UploadFile | None = None, _: User = Depends(get_current_user)):
    from app.core.config import get_settings

    settings = get_settings()
    demo_dir = Path(settings.demo_input_dir)
    demo_dir.mkdir(parents=True, exist_ok=True)
    json_path = demo_dir / json_file.filename
    json_path.write_bytes(await json_file.read())
    media_path = None
    if media_file is not None:
        media_path = demo_dir / media_file.filename
        media_path.write_bytes(await media_file.read())
    return {"ok": True, "json_path": str(json_path), "media_path": str(media_path) if media_path else None}


@router.post("/replay/start")
def replay_start(payload: ReplayStartRequest, _: User = Depends(get_current_user)):
    started = start_replay(SessionLocal, speed=payload.speed, limit=payload.limit)
    if not started:
        raise HTTPException(status_code=409, detail="Replay already running")
    return {"ok": True}


@router.post("/replay/stop")
def replay_stop(_: User = Depends(get_current_user)):
    stop_replay()
    return {"ok": True}


@router.post("/twitter/poll")
def ingest_from_twitter(
    query: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not settings.twitter_bearer_token:
        raise HTTPException(status_code=400, detail="TWITTER_BEARER_TOKEN is not configured")
    search_query = (query or "").strip() or settings.twitter_search_query()
    ingested = ingest_twitter_once(db=db, query=search_query, limit=limit)
    return {"ok": True, "ingested": ingested}


@router.post("/twitter/start")
def start_twitter_stream(payload: TwitterStreamStartRequest, _: User = Depends(get_current_user)):
    if not settings.twitter_bearer_token:
        raise HTTPException(status_code=400, detail="TWITTER_BEARER_TOKEN is not configured")
    query = (payload.query or "").strip() or settings.twitter_search_query()
    interval = max(10, payload.interval_sec)
    per_poll = min(100, max(1, payload.limit_per_poll))
    started = start_twitter_polling(SessionLocal, query=query, limit_per_poll=per_poll, interval_sec=interval)
    if not started:
        raise HTTPException(status_code=409, detail="Twitter polling already running")
    return {"ok": True, "query": query, "limit_per_poll": per_poll, "interval_sec": interval}


@router.post("/twitter/stop")
def stop_twitter_stream(_: User = Depends(get_current_user)):
    stop_twitter_polling()
    return {"ok": True}


@router.get("/twitter/status")
def twitter_status(_: User = Depends(get_current_user)):
    return twitter_polling_status()


@router.get("/twitter/debug")
def twitter_debug(
    query: str | None = None,
    limit: int = Query(20, ge=5, le=100),
    _: User = Depends(get_current_user),
):
    """Check if Twitter API returns tweets: query used, status_code, tweet_count, and any error."""
    if not settings.twitter_bearer_token:
        return {"query": "", "status_code": None, "tweet_count": 0, "error": "TWITTER_BEARER_TOKEN not configured"}
    return twitter_debug_search(query=query, limit=limit)


def _configured_facebook_pages() -> list[str]:
    raw = settings.facebook_page_ids or ""
    return [item.strip() for item in raw.split(",") if item.strip()]


@router.post("/facebook/poll")
def ingest_from_facebook(
    limit_per_page: int = 20,
    page_ids: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not settings.facebook_page_access_token:
        raise HTTPException(status_code=400, detail="FACEBOOK_PAGE_ACCESS_TOKEN is not configured")
    pages = [p.strip() for p in (page_ids or "").split(",") if p.strip()] or _configured_facebook_pages()
    if not pages:
        raise HTTPException(status_code=400, detail="No Facebook page IDs configured")
    ingested = ingest_facebook_once(db=db, page_ids=pages, limit_per_page=min(100, max(1, limit_per_page)))
    return {"ok": True, "ingested": ingested, "page_ids": pages}


@router.post("/facebook/start")
def start_facebook_stream(payload: FacebookStreamStartRequest, _: User = Depends(get_current_user)):
    if not settings.facebook_page_access_token:
        raise HTTPException(status_code=400, detail="FACEBOOK_PAGE_ACCESS_TOKEN is not configured")
    pages = payload.page_ids or _configured_facebook_pages()
    if not pages:
        raise HTTPException(status_code=400, detail="No Facebook page IDs configured")
    interval = max(15, payload.interval_sec)
    per_page = min(100, max(1, payload.limit_per_page))
    started = start_facebook_polling(SessionLocal, page_ids=pages, limit_per_page=per_page, interval_sec=interval)
    if not started:
        raise HTTPException(status_code=409, detail="Facebook polling already running")
    return {"ok": True, "page_ids": pages, "limit_per_page": per_page, "interval_sec": interval}


@router.post("/facebook/stop")
def stop_facebook_stream(_: User = Depends(get_current_user)):
    stop_facebook_polling()
    return {"ok": True}


@router.get("/facebook/status")
def facebook_status(_: User = Depends(get_current_user)):
    return facebook_polling_status()


@router.get("/facebook/debug")
def facebook_debug(
    page_id: str | None = Query(None, description="Page ID to test (default: first from FACEBOOK_PAGE_IDS)"),
    limit: int = Query(10, ge=1, le=50, description="Max posts to request from API"),
    _: User = Depends(get_current_user),
):
    """Check if Facebook Graph API returns posts: page_id, status_code, post_count, and any API error (no DB write)."""
    if not settings.facebook_page_access_token:
        return {
            "ok": False,
            "error": "FACEBOOK_PAGE_ACCESS_TOKEN is not configured",
            "page_id": page_id,
            "status_code": None,
            "post_count": 0,
            "facebook_error": None,
            "sample_post_ids": [],
        }
    if not page_id and not _configured_facebook_pages():
        return {
            "ok": False,
            "error": "No page_id provided and no FACEBOOK_PAGE_IDS configured",
            "page_id": None,
            "status_code": None,
            "post_count": 0,
            "facebook_error": None,
            "sample_post_ids": [],
        }
    return facebook_debug_fetch(page_id=page_id, limit=limit)


# --- YouTube ---


@router.get("/youtube/debug")
def youtube_debug(
    query: str = Query("Sri Lanka", description="Search query to test YouTube API"),
    limit: int = Query(5, ge=1, le=20),
    _: User | None = Depends(get_optional_user),
):
    """Test YouTube API: returns how many videos the search returns and any API error (no DB write)."""
    if not settings.youtube_api_key:
        return {"ok": False, "error": "YOUTUBE_API_KEY not configured", "items_count": 0, "sample": [], "youtube_error": None}
    try:
        import requests
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": min(3, max(1, limit)),
            "key": settings.youtube_api_key,
            "order": getattr(settings, "youtube_order", None) or "date",
        }
        if getattr(settings, "youtube_region_code", None):
            params["regionCode"] = settings.youtube_region_code
        resp = requests.get("https://www.googleapis.com/youtube/v3/search", params=params, timeout=15)
        data = resp.json() if resp.text else {}
        youtube_error = data.get("error")
        if resp.status_code != 200 or youtube_error:
            err_msg = youtube_error.get("message", str(youtube_error)) if youtube_error else f"HTTP {resp.status_code}"
            return {
                "ok": False,
                "error": err_msg,
                "items_count": 0,
                "sample": [],
                "youtube_error": youtube_error,
                "http_status": resp.status_code,
            }
        items_raw = data.get("items", [])
        sample = []
        for item in items_raw[:5]:
            vid = item.get("id", {}).get("videoId")
            sn = item.get("snippet", {})
            sample.append({"id": vid, "title": (sn.get("title") or "")[:80], "channel": sn.get("channelTitle")})
        return {"ok": True, "items_count": len(items_raw), "query": query, "sample": sample, "youtube_error": None}
    except Exception as e:
        return {"ok": False, "error": str(e), "items_count": 0, "sample": [], "youtube_error": None}


@router.post("/youtube/poll")
def ingest_from_youtube(
    query: str = settings.youtube_default_query,
    limit: int = 15,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not settings.youtube_api_key:
        raise HTTPException(status_code=400, detail="YOUTUBE_API_KEY is not configured")
    ingested = ingest_youtube_once(db=db, query=query, limit=limit)
    return {"ok": True, "ingested": ingested}


@router.post("/youtube/start")
def start_youtube_stream(payload: YouTubeStreamStartRequest, _: User = Depends(get_current_user)):
    if not settings.youtube_api_key:
        raise HTTPException(status_code=400, detail="YOUTUBE_API_KEY is not configured")
    query = payload.query or settings.youtube_default_query
    interval = max(15, payload.interval_sec)
    per_poll = min(50, max(1, payload.limit_per_poll))
    started = start_youtube_polling(SessionLocal, query=query, limit_per_poll=per_poll, interval_sec=interval)
    if not started:
        raise HTTPException(status_code=409, detail="YouTube polling already running")
    return {"ok": True, "query": query, "limit_per_poll": per_poll, "interval_sec": interval}


@router.post("/youtube/stop")
def stop_youtube_stream(_: User = Depends(get_current_user)):
    stop_youtube_polling()
    return {"ok": True}


@router.get("/youtube/status")
def youtube_status(_: User = Depends(get_current_user)):
    return youtube_polling_status()


@router.post("/youtube/poll/hashtag")
def ingest_from_youtube_hashtag(
    hashtag: str = "safelink",
    limit: int = 15,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Fetch YouTube videos by hashtag/search term (e.g. safelink)."""
    if not settings.youtube_api_key:
        raise HTTPException(status_code=400, detail="YOUTUBE_API_KEY is not configured")
    tag = hashtag.strip().lstrip("#")
    ingested = ingest_youtube_hashtag_once(db=db, hashtag=tag, limit=min(50, max(1, limit)))
    return {"ok": True, "ingested": ingested, "hashtag": tag}


def _normalize_platform(platform: str | list[str] | None) -> str | None:
    if platform is None:
        return None
    if isinstance(platform, list):
        platform = platform[0] if platform else None
    if not platform or not isinstance(platform, str):
        return None
    return platform.strip().lower() or None


@router.get("/posts")
def list_recent_posts(
    platform_filter: str | None = Query(None, alias="platform"),
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User | None = Depends(get_optional_user),
):
    """List recently ingested posts (all platforms or filter by platform=youtube|twitter|facebook|demo)."""
    try:
        platform_val = _normalize_platform(platform_filter)
        query = db.query(Post).order_by(Post.created_at.desc())
        if platform_val:
            query = query.filter(Post.platform == platform_val)
        query = query.limit(min(100, max(1, limit)))
        posts = query.all()
        out = []
        for p in posts:
            try:
                out.append({
                    "id": p.id,
                    "platform": str(p.platform) if p.platform is not None else "",
                    "platform_post_id": str(p.platform_post_id) if p.platform_post_id is not None else "",
                    "author": str(p.author) if p.author is not None else None,
                    "text": (p.text or "")[:500],
                    "url": str(p.url) if p.url is not None else None,
                    "created_at": p.created_at.isoformat() if getattr(p, "created_at", None) else None,
                })
            except Exception as ser:
                raise HTTPException(status_code=500, detail=f"Serialize post {getattr(p, 'id', '?')}: {ser!s}")
        return out
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list posts: {str(e)}")


@router.get("/posts/{post_id}/analysis")
def get_post_analysis(
    post_id: int,
    db: Session = Depends(get_db),
    _: User | None = Depends(get_optional_user),
):
    """Return the analysis for a post and why it did or did not become an alert."""
    from app.core.config import get_settings
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    settings = get_settings()
    threshold = settings.alert_threshold
    analysis = db.query(Analysis).filter(Analysis.post_id == post_id).order_by(Analysis.created_at.desc()).first()
    if not analysis:
        return {
            "post_id": post_id,
            "platform": post.platform,
            "has_analysis": False,
            "alert_threshold": threshold,
            "why_no_alert": "Post has not been analyzed yet. The Celery worker may not be running, or the task is still queued.",
        }
    has_alert = db.query(Alert).filter(Alert.post_id == post_id).first() is not None
    reason = None
    if not has_alert and analysis.fusion_score < threshold:
        reasons = [f"Fusion score {analysis.fusion_score:.1f} is below alert threshold ({threshold})."]
        if analysis.video_score == 0.0 and not db.query(Media).filter(Media.post_id == post_id).count():
            reasons.append("Post has no video/audio (e.g. YouTube ingestion does not download media); only text was scored.")
        reason = " ".join(reasons)
    return {
        "post_id": post_id,
        "platform": post.platform,
        "has_analysis": True,
        "has_alert": has_alert,
        "alert_threshold": threshold,
        "fusion_score": round(analysis.fusion_score, 2),
        "severity": analysis.severity,
        "category": analysis.category,
        "text_probs": analysis.text_probs,
        "video_score": analysis.video_score,
        "why_no_alert": reason,
    }


@router.delete("/posts")
def delete_all_posts(
    platform_filter: str | None = Query(None, alias="platform"),
    db: Session = Depends(get_db),
    _: User | None = Depends(get_optional_user),
):
    """Delete all posts (optionally only for one platform). Also removes related alerts, feedback, media, and analyses."""
    platform_val = _normalize_platform(platform_filter)
    query = db.query(Post)
    if platform_val:
        query = query.filter(Post.platform == platform_val)
    posts = query.all()
    post_ids = [p.id for p in posts]
    if not post_ids:
        return {"ok": True, "deleted": 0, "message": "No posts to delete"}
    alert_ids = [a.id for a in db.query(Alert.id).filter(Alert.post_id.in_(post_ids)).all()]
    for aid in alert_ids:
        db.query(Feedback).filter(Feedback.alert_id == aid).delete(synchronize_session=False)
    db.query(Alert).filter(Alert.post_id.in_(post_ids)).delete(synchronize_session=False)
    db.query(Media).filter(Media.post_id.in_(post_ids)).delete(synchronize_session=False)
    db.query(Analysis).filter(Analysis.post_id.in_(post_ids)).delete(synchronize_session=False)
    db.query(Post).filter(Post.id.in_(post_ids)).delete(synchronize_session=False)
    db.commit()
    return {"ok": True, "deleted": len(post_ids), "message": f"Removed {len(post_ids)} post(s)"}


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: User | None = Depends(get_optional_user),
):
    """Delete a post and its related alerts, analyses, and media."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    alerts = db.query(Alert).filter(Alert.post_id == post_id).all()
    for alert in alerts:
        db.query(Feedback).filter(Feedback.alert_id == alert.id).delete()
    db.query(Alert).filter(Alert.post_id == post_id).delete()
    db.delete(post)
    db.commit()
    return {"ok": True, "deleted": post_id}
