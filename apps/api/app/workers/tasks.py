from app.db.models import Media, Post
from app.db.session import SessionLocal
from app.services.pipeline import run_analysis
from app.services.video_download import copy_to_post_storage, download_video_for_post
from app.workers.celery_app import celery_app


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def analyze_post_task(self, post_id: int):
    db = SessionLocal()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"ok": False, "reason": "post_not_found"}
        result = run_analysis(db, post)
        return {"ok": True, **result}
    finally:
        db.close()


@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 2},
    time_limit=600,
    soft_time_limit=540,
)
def download_media_and_analyze_task(self, post_id: int):
    """
    For YouTube posts: download video from post URL, attach as Media, then run analysis.
    For other posts: run analysis only. This allows video/audio harm detection for ingested links.
    """
    db = SessionLocal()
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"ok": False, "reason": "post_not_found"}
        downloaded_path = None
        if post.platform == "youtube" and (post.url or "").strip().startswith("http"):
            downloaded_path = download_video_for_post(post.url or "", post.id)
            if downloaded_path:
                stored_path = copy_to_post_storage(downloaded_path, post.id)
                media = Media(
                    post_id=post.id,
                    type="video",
                    path=stored_path,
                    meta_json={"source": "download", "url": post.url},
                )
                db.add(media)
                db.commit()
                db.refresh(post)
        result = run_analysis(db, post)
        return {"ok": True, "downloaded": bool(downloaded_path), **result}
    finally:
        db.close()
