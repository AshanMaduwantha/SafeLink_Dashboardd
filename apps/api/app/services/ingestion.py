import json
import shutil
import tempfile
import threading
import time
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import urlparse

import requests
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Media, Post
from app.workers.tasks import analyze_post_task, download_media_and_analyze_task

_replay_thread: Optional[threading.Thread] = None
_replay_stop = threading.Event()
_watcher_thread: Optional[threading.Thread] = None
_watcher_stop = threading.Event()
_processed_files: set[str] = set()
_twitter_thread: Optional[threading.Thread] = None
_twitter_stop = threading.Event()
_facebook_thread: Optional[threading.Thread] = None
_facebook_stop = threading.Event()
_youtube_thread: Optional[threading.Thread] = None
_youtube_stop = threading.Event()
def _copy_media_to_storage(src: str, post_id: int) -> str:
    settings = get_settings()
    src_path = Path(src)
    if not src_path.exists():
        return src
    out_dir = Path(settings.media_root) / f"post_{post_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / src_path.name
    shutil.copy2(src_path, dst)
    return str(dst)


def create_post_and_queue(
    db: Session,
    platform: str,
    platform_post_id: str,
    text: str,
    author: str,
    url: str,
    raw_json: dict,
    media_paths: list[str],
) -> Post:
    post = Post(
        platform=platform,
        platform_post_id=platform_post_id,
        text=text,
        author=author,
        url=url,
        raw_json=raw_json,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    for path in media_paths:
        media_type = "video" if path.lower().endswith(".mp4") else "image"
        stored_path = _copy_media_to_storage(path, post.id)
        media = Media(post_id=post.id, type=media_type, path=stored_path, meta_json={})
        db.add(media)
    db.commit()

    # YouTube: download video then analyze (so video/audio can trigger alerts)
    if post.platform == "youtube" and (post.url or "").strip().startswith("http"):
        download_media_and_analyze_task.delay(post.id)
    else:
        analyze_post_task.delay(post.id)
    return post


def replay_dataset(db_factory, speed: float = 1.0, limit: int = 100) -> None:
    settings = get_settings()
    demo_dir = Path(settings.demo_input_dir)
    demo_dir.mkdir(parents=True, exist_ok=True)
    files = list(demo_dir.glob("*.json"))[:limit]

    for file_path in files:
        if _replay_stop.is_set():
            break
        payload = json.loads(file_path.read_text(encoding="utf-8"))
        db = db_factory()
        try:
            create_post_and_queue(
                db=db,
                platform=payload.get("platform", "demo"),
                platform_post_id=payload.get("platform_post_id", file_path.stem),
                text=payload.get("text", ""),
                author=payload.get("author", "unknown"),
                url=payload.get("url", ""),
                raw_json=payload,
                media_paths=payload.get("media_paths", []),
            )
        finally:
            db.close()
        time.sleep(max(0.1, 1.0 / max(0.1, speed)))


def start_replay(db_factory, speed: float = 1.0, limit: int = 100) -> bool:
    global _replay_thread
    if _replay_thread and _replay_thread.is_alive():
        return False
    _replay_stop.clear()
    _replay_thread = threading.Thread(target=replay_dataset, args=(db_factory, speed, limit), daemon=True)
    _replay_thread.start()
    return True


def stop_replay() -> None:
    _replay_stop.set()


def poll_twitter_recent_search(query: str, limit: int = 10) -> tuple[list[dict], dict]:
    """Fetch tweets from Twitter API v2 recent search. Returns (tweets, includes dict with 'media' key)."""
    settings = get_settings()
    if not settings.twitter_bearer_token:
        return [], {}
    headers = {"Authorization": f"Bearer {settings.twitter_bearer_token}"}
    params = {
        "query": query,
        "max_results": min(100, max(10, limit)),
        "tweet.fields": "created_at,lang,author_id,attachments",
        "expansions": "attachments.media_keys",
        "media.fields": "url,preview_image_url,type",
    }
    resp = requests.get("https://api.twitter.com/2/tweets/search/recent", headers=headers, params=params, timeout=25)
    if resp.status_code != 200:
        return [], {}
    data = resp.json()
    tweets = data.get("data", [])
    includes = data.get("includes", {})
    return tweets, includes


def twitter_debug_search(query: Optional[str] = None, limit: int = 10) -> dict:
    """
    Call Twitter API and return status/count/error for debugging.
    Returns dict with: query, status_code, tweet_count, error (if any), sample_tweet_ids.
    """
    settings = get_settings()
    if not settings.twitter_bearer_token:
        return {"query": query or "", "status_code": None, "tweet_count": 0, "error": "TWITTER_BEARER_TOKEN not set"}
    search_query = (query or "").strip() or settings.twitter_search_query()
    headers = {"Authorization": f"Bearer {settings.twitter_bearer_token}"}
    params = {
        "query": search_query,
        "max_results": min(100, max(10, limit)),
        "tweet.fields": "created_at,lang,author_id",
    }
    try:
        resp = requests.get(
            "https://api.twitter.com/2/tweets/search/recent",
            headers=headers,
            params=params,
            timeout=25,
        )
        body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        tweets = body.get("data", []) if isinstance(body, dict) else []
        errs = body.get("errors") or []
        error_detail = (
            body.get("detail")  # e.g. CreditsDepleted message
            or body.get("title")  # e.g. CreditsDepleted
            or (errs[0].get("message") or errs[0].get("title")) if errs else None
        )
        return {
            "query": search_query,
            "status_code": resp.status_code,
            "tweet_count": len(tweets),
            "error": None if resp.ok else (error_detail or resp.text or f"HTTP {resp.status_code}"),
            "sample_tweet_ids": [t.get("id") for t in tweets[:5]] if tweets else [],
        }
    except Exception as e:
        return {
            "query": search_query,
            "status_code": None,
            "tweet_count": 0,
            "error": str(e),
            "sample_tweet_ids": [],
        }


def _download_media_to_temp(media_list: list[dict], tweet_id: str) -> list[str]:
    """Download media URLs to temp files. Returns list of local file paths."""
    paths = []
    for i, m in enumerate(media_list):
        url = (m.get("url") or m.get("preview_image_url")) or None
        if not url:
            continue
        try:
            r = requests.get(url, timeout=15, stream=True)
            r.raise_for_status()
            ext = "mp4" if (m.get("type") or "").lower() in ("video", "animated_gif") else "jpg"
            suffix = f"_{tweet_id}_{i}.{ext}"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
                paths.append(f.name)
        except Exception:
            continue
    return paths


def ingest_twitter_once(db: Session, query: str, limit: int = 10) -> int:
    tweets, includes = poll_twitter_recent_search(query=query, limit=limit)
    media_by_key = {m["media_key"]: m for m in includes.get("media", [])}
    ingested = 0
    for tweet in tweets:
        post_id = tweet.get("id")
        if not post_id:
            continue
        existing = db.query(Post).filter(Post.platform == "twitter", Post.platform_post_id == str(post_id)).first()
        if existing:
            continue
        media_keys = (tweet.get("attachments") or {}).get("media_keys", [])
        media_list = [media_by_key[k] for k in media_keys if k in media_by_key]
        media_paths = _download_media_to_temp(media_list, str(post_id)) if media_list else []
        try:
            create_post_and_queue(
                db=db,
                platform="twitter",
                platform_post_id=str(post_id),
                text=tweet.get("text", ""),
                author=str(tweet.get("author_id", "unknown")),
                url=f"https://x.com/i/web/status/{post_id}",
                raw_json=tweet,
                media_paths=media_paths,
            )
            ingested += 1
        finally:
            for p in media_paths:
                try:
                    Path(p).unlink(missing_ok=True)
                except Exception:
                    pass
    return ingested


def _watch_folder_loop(db_factory) -> None:
    settings = get_settings()
    demo_dir = Path(settings.demo_input_dir)
    demo_dir.mkdir(parents=True, exist_ok=True)
    while not _watcher_stop.is_set():
        for file_path in demo_dir.glob("*.json"):
            if file_path.name in _processed_files:
                continue
            try:
                payload = json.loads(file_path.read_text(encoding="utf-8"))
                media_paths = payload.get("media_paths", [])
                fixed_paths = []
                for path in media_paths:
                    p = Path(path)
                    if p.is_absolute():
                        fixed_paths.append(str(p))
                    else:
                        fixed_paths.append(str((demo_dir / p).resolve()))
                db = db_factory()
                try:
                    create_post_and_queue(
                        db=db,
                        platform=payload.get("platform", "demo"),
                        platform_post_id=payload.get("platform_post_id", file_path.stem),
                        text=payload.get("text", ""),
                        author=payload.get("author", "watcher"),
                        url=payload.get("url", ""),
                        raw_json=payload,
                        media_paths=fixed_paths,
                    )
                finally:
                    db.close()
                _processed_files.add(file_path.name)
            except Exception:
                continue
        time.sleep(2.0)


def start_demo_folder_watcher(db_factory) -> bool:
    global _watcher_thread
    if _watcher_thread and _watcher_thread.is_alive():
        return False
    _watcher_stop.clear()
    _watcher_thread = threading.Thread(target=_watch_folder_loop, args=(db_factory,), daemon=True)
    _watcher_thread.start()
    return True


def _twitter_poll_loop(db_factory, query: str, limit_per_poll: int, interval_sec: int) -> None:
    while not _twitter_stop.is_set():
        db = db_factory()
        try:
            ingest_twitter_once(db, query=query, limit=limit_per_poll)
        except Exception:
            pass
        finally:
            db.close()
        for _ in range(max(1, interval_sec)):
            if _twitter_stop.is_set():
                break
            time.sleep(1)


def start_twitter_polling(db_factory, query: str, limit_per_poll: int = 20, interval_sec: int = 30) -> bool:
    global _twitter_thread
    if _twitter_thread and _twitter_thread.is_alive():
        return False
    _twitter_stop.clear()
    _twitter_thread = threading.Thread(
        target=_twitter_poll_loop,
        args=(db_factory, query, limit_per_poll, interval_sec),
        daemon=True,
    )
    _twitter_thread.start()
    return True


def stop_twitter_polling() -> None:
    _twitter_stop.set()


def twitter_polling_status() -> dict:
    return {
        "running": bool(_twitter_thread and _twitter_thread.is_alive()),
    }


def poll_facebook_page_posts(page_id: str, limit: int = 20) -> Iterable[dict]:
    settings = get_settings()
    if not settings.facebook_page_access_token:
        return []
    endpoint = f"https://graph.facebook.com/v21.0/{page_id}/posts"
    params = {
        "access_token": settings.facebook_page_access_token,
        "fields": (
            "id,message,created_time,permalink_url,from,"
            "attachments{media_type,type,url,unshimmed_url,media,"
            "subattachments{media_type,type,url,unshimmed_url,media}}"
        ),
        "limit": min(100, max(1, limit)),
    }
    resp = requests.get(endpoint, params=params, timeout=20)
    if resp.status_code != 200:
        return []
    payload = resp.json()
    return payload.get("data", [])


def facebook_debug_fetch(page_id: Optional[str] = None, limit: int = 10) -> dict:
    """
    Call Facebook Graph API for page posts and return status, count, and any error.
    No DB write. Use for debugging why poll returns no posts or alerts.
    """
    settings = get_settings()
    if not settings.facebook_page_access_token:
        return {
            "ok": False,
            "error": "FACEBOOK_PAGE_ACCESS_TOKEN is not set",
            "page_id": page_id,
            "status_code": None,
            "post_count": 0,
            "facebook_error": None,
            "sample_post_ids": [],
        }
    pages = [p.strip() for p in (settings.facebook_page_ids or "").split(",") if p.strip()]
    if not page_id and not pages:
        return {
            "ok": False,
            "error": "No page_id provided and FACEBOOK_PAGE_IDS is not set",
            "page_id": None,
            "status_code": None,
            "post_count": 0,
            "facebook_error": None,
            "sample_post_ids": [],
        }
    target_page = page_id or pages[0]
    endpoint = f"https://graph.facebook.com/v21.0/{target_page}/posts"
    params = {
        "access_token": settings.facebook_page_access_token,
        "fields": (
            "id,message,created_time,permalink_url,from,"
            "attachments{media_type,type,url,unshimmed_url,media,"
            "subattachments{media_type,type,url,unshimmed_url,media}}"
        ),
        "limit": min(100, max(1, limit)),
    }
    try:
        resp = requests.get(endpoint, params=params, timeout=20)
        body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") and resp.text else {}
        data = body.get("data", []) if isinstance(body, dict) else []
        err = body.get("error") if isinstance(body, dict) else None
        err_message = err.get("message", str(err)) if err else None
        err_code = err.get("code") if isinstance(err, dict) else None
        return {
            "ok": resp.status_code == 200 and err is None,
            "error": None if resp.ok and not err else (err_message or resp.text or f"HTTP {resp.status_code}"),
            "page_id": target_page,
            "status_code": resp.status_code,
            "post_count": len(data),
            "facebook_error": {"message": err_message, "code": err_code, "type": err.get("type")} if err else None,
            "sample_post_ids": [p.get("id") for p in data[:5] if p.get("id")],
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "page_id": target_page,
            "status_code": None,
            "post_count": 0,
            "facebook_error": None,
            "sample_post_ids": [],
        }


def _iter_attachment_nodes(attachments_payload: dict) -> Iterable[dict]:
    for node in (attachments_payload or {}).get("data", []):
        yield node
        for child in (node.get("subattachments") or {}).get("data", []):
            yield child


def _first_http_url(candidates: list[object]) -> str:
    for candidate in candidates:
        value = str(candidate or "").strip()
        if value.startswith("http://") or value.startswith("https://"):
            return value
    return ""


def _facebook_media_urls(post: dict) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    attachments = post.get("attachments") or {}

    for node in _iter_attachment_nodes(attachments):
        media = node.get("media") or {}
        media_type = str(node.get("media_type") or node.get("type") or "").lower()
        image = media.get("image") or {}

        if "video" in media_type:
            candidate = _first_http_url(
                [
                    media.get("source"),
                    node.get("unshimmed_url"),
                    node.get("url"),
                ]
            )
        else:
            candidate = _first_http_url(
                [
                    image.get("src"),
                    media.get("source"),
                    node.get("unshimmed_url"),
                    node.get("url"),
                ]
            )

        if candidate and candidate not in seen:
            seen.add(candidate)
            urls.append(candidate)

    return urls


def _suffix_from_content_type(content_type: str) -> str:
    ctype = (content_type or "").split(";")[0].strip().lower()
    if ctype == "video/mp4":
        return ".mp4"
    if ctype == "image/jpeg":
        return ".jpg"
    if ctype == "image/png":
        return ".png"
    if ctype == "image/webp":
        return ".webp"
    if ctype == "image/gif":
        return ".gif"
    if ctype.startswith("video/"):
        return ".mp4"
    if ctype.startswith("image/"):
        return ".jpg"
    return ""


def _download_remote_media(url: str, prefix: str) -> Optional[str]:
    settings = get_settings()
    try:
        resp = requests.get(url, timeout=30, stream=True, allow_redirects=True)
    except Exception:
        return None

    if resp.status_code != 200:
        return None

    content_type = (resp.headers.get("content-type") or "").lower()
    if not (content_type.startswith("video/") or content_type.startswith("image/")):
        return None

    parsed_suffix = Path(urlparse(resp.url).path).suffix.lower()
    allowed_suffixes = {".mp4", ".mov", ".m4v", ".jpg", ".jpeg", ".png", ".webp", ".gif"}
    suffix = parsed_suffix if parsed_suffix in allowed_suffixes else _suffix_from_content_type(content_type)
    if not suffix:
        return None

    tmp_dir = Path(settings.media_root) / "_ingest_tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    safe_prefix = "".join(ch if ch.isalnum() or ch in {"_", "-"} else "_" for ch in prefix)
    out_path = tmp_dir / f"{safe_prefix}_{int(time.time() * 1000)}{suffix}"

    try:
        with out_path.open("wb") as fh:
            for chunk in resp.iter_content(chunk_size=1024 * 256):
                if chunk:
                    fh.write(chunk)
    except Exception:
        return None

    return str(out_path)


def _facebook_media_paths(post: dict) -> list[str]:
    post_id = str(post.get("id", "post"))
    urls = _facebook_media_urls(post)
    paths: list[str] = []
    for idx, url in enumerate(urls):
        local_path = _download_remote_media(url, f"fb_{post_id}_{idx}")
        if local_path:
            paths.append(local_path)
    return paths


def _message_contains_hashtags(message: str, hashtags: list[str]) -> bool:
    if not hashtags:
        return True
    msg_lower = (message or "").lower()
    for tag in hashtags:
        tag_lower = (tag or "").strip().lower()
        if not tag_lower:
            continue
        if tag_lower in msg_lower or f"#{tag_lower}" in msg_lower:
            return True
    return False


def _text_contains_hashtag(text: str, tag: str) -> bool:
    """Return True if text contains the hashtag (as word or #tag)."""
    if not tag:
        return False
    if not text:
        return False
    text_lower = (text or "").lower()
    tag_lower = (tag or "").strip().lstrip("#").lower()
    return bool(tag_lower and (tag_lower in text_lower or f"#{tag_lower}" in text_lower))


def _text_satisfies_two_hashtags(text: str, primary: str, others: list[str]) -> bool:
    """Return True only if text contains the primary hashtag AND at least one *other* hashtag (different from primary)."""
    if not primary or not text:
        return False
    if not _text_contains_hashtag(text, primary):
        return False
    text_lower = (text or "").lower()
    primary_lower = (primary or "").strip().lstrip("#").lower()
    for tag in others or []:
        tag_lower = (tag or "").strip().lstrip("#").lower()
        if not tag_lower or tag_lower == primary_lower:
            continue
        if tag_lower in text_lower or f"#{tag_lower}" in text_lower:
            return True
    return False


def ingest_facebook_once(db: Session, page_ids: list[str], limit_per_page: int = 20) -> int:
    """Ingest all posts from the given Facebook page(s). No hashtag filtering."""
    settings = get_settings()
    ingested = 0
    for page_id in page_ids:
        posts = list(poll_facebook_page_posts(page_id=page_id, limit=limit_per_page))
        for post in posts:
            post_id = str(post.get("id", ""))
            if not post_id:
                continue
            existing = db.query(Post).filter(Post.platform == "facebook", Post.platform_post_id == post_id).first()
            if existing:
                continue
            create_post_and_queue(
                db=db,
                platform="facebook",
                platform_post_id=post_id,
                text=post.get("message", "") or "",
                author=str((post.get("from") or {}).get("name", page_id)),
                url=post.get("permalink_url", ""),
                raw_json=post,
                media_paths=_facebook_media_paths(post),
            )
            ingested += 1
    return ingested


def _facebook_poll_loop(db_factory, page_ids: list[str], limit_per_page: int, interval_sec: int) -> None:
    while not _facebook_stop.is_set():
        db = db_factory()
        try:
            ingest_facebook_once(db, page_ids=page_ids, limit_per_page=limit_per_page)
        except Exception:
            pass
        finally:
            db.close()
        for _ in range(max(1, interval_sec)):
            if _facebook_stop.is_set():
                break
            time.sleep(1)


def start_facebook_polling(db_factory, page_ids: list[str], limit_per_page: int = 20, interval_sec: int = 60) -> bool:
    global _facebook_thread
    if _facebook_thread and _facebook_thread.is_alive():
        return False
    _facebook_stop.clear()
    _facebook_thread = threading.Thread(
        target=_facebook_poll_loop,
        args=(db_factory, page_ids, limit_per_page, interval_sec),
        daemon=True,
    )
    _facebook_thread.start()
    return True


def stop_facebook_polling() -> None:
    _facebook_stop.set()


def facebook_polling_status() -> dict:
    return {"running": bool(_facebook_thread and _facebook_thread.is_alive())}


# --- YouTube (Data API v3 search) ---


def fetch_youtube_full_snippets(video_ids: list[str]) -> dict[str, dict]:
    """Fetch full title and description for video IDs via videos/list (no truncation). Returns {id: {title, description}}."""
    settings = get_settings()
    if not settings.youtube_api_key or not video_ids:
        return {}
    result = {}
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        params = {
            "part": "snippet",
            "id": ",".join(batch),
            "key": settings.youtube_api_key,
        }
        resp = requests.get("https://www.googleapis.com/youtube/v3/videos", params=params, timeout=15)
        if resp.status_code != 200:
            continue
        data = resp.json()
        for item in data.get("items", []):
            vid = item.get("id")
            if not vid:
                continue
            snippet = item.get("snippet", {})
            result[vid] = {
                "title": snippet.get("title", ""),
                "description": snippet.get("description", ""),
            }
    return result


def poll_youtube_search(query: str, limit: int = 15) -> Iterable[dict]:
    settings = get_settings()
    if not settings.youtube_api_key:
        return []
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": min(3, max(1, limit)),
        "key": settings.youtube_api_key,
        "order": getattr(settings, "youtube_order", None) or "date",
    }
    region = getattr(settings, "youtube_region_code", None)
    if region:
        params["regionCode"] = region
    resp = requests.get("https://www.googleapis.com/youtube/v3/search", params=params, timeout=20)
    if resp.status_code != 200:
        return []
    data = resp.json()
    if data.get("error"):
        return []
    items = data.get("items", [])
    # If region (e.g. lk) returns no results, retry without region to get worldwide results
    if not items and region:
        params.pop("regionCode", None)
        resp2 = requests.get("https://www.googleapis.com/youtube/v3/search", params=params, timeout=20)
        if resp2.status_code == 200:
            data2 = resp2.json()
            if not data2.get("error"):
                items = data2.get("items", [])
    for item in items:
        vid = item.get("id", {}).get("videoId")
        if not vid:
            continue
        snippet = item.get("snippet", {})
        yield {
            "id": vid,
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "channelTitle": snippet.get("channelTitle", "unknown"),
            "url": f"https://www.youtube.com/watch?v={vid}",
            "raw": item,
        }


def _ingest_youtube_items(db: Session, items: Iterable[dict]) -> int:
    settings = get_settings()
    primary = (getattr(settings, "primary_hashtag", None) or "").strip().lstrip("#")
    others = getattr(settings, "youtube_hashtags_list", None) or []
    ingested = 0
    for item in items:
        vid = item.get("id")
        if not vid:
            continue
        existing = db.query(Post).filter(Post.platform == "youtube", Post.platform_post_id == vid).first()
        if existing:
            continue
        text = (item.get("title", "") or "") + "\n" + (item.get("description", "") or "")
        text = (text or "").strip() or "(no text)"
        # Require primary hashtag (e.g. safelinkapp); full descriptions are used when fetched via fetch_youtube_full_snippets.
        if primary:
            require_two = getattr(settings, "require_two_hashtags", False)
            if require_two and not _text_satisfies_two_hashtags(text, primary, others):
                continue
            if not require_two and not _text_contains_hashtag(text, primary):
                continue
        create_post_and_queue(
            db=db,
            platform="youtube",
            platform_post_id=vid,
            text=text,
            author=item.get("channelTitle", "unknown"),
            url=item.get("url", ""),
            raw_json=item.get("raw", item),
            media_paths=[],
        )
        ingested += 1
    return ingested


def _youtube_items_with_full_descriptions(items: list[dict]) -> list[dict]:
    """Enrich YouTube search items with full title/description from videos/list (search truncates to ~160 chars)."""
    if not items:
        return items
    ids = [i.get("id") for i in items if i.get("id")]
    full = fetch_youtube_full_snippets(ids)
    for item in items:
        vid = item.get("id")
        if vid and vid in full:
            item["title"] = full[vid].get("title", item.get("title", ""))
            item["description"] = full[vid].get("description", item.get("description", ""))
    return items


def ingest_youtube_once(db: Session, query: str, limit: int = 15) -> int:
    settings = get_settings()
    items = list(poll_youtube_search(query=query, limit=limit))
    items = _youtube_items_with_full_descriptions(items)
    ingested = _ingest_youtube_items(db, items)
    for hashtag in getattr(settings, "youtube_hashtags_list", None) or []:
        if not hashtag:
            continue
        limit_per_hashtag = min(15, max(5, limit // 2))
        items_ht = list(poll_youtube_search(query=hashtag, limit=limit_per_hashtag))
        items_ht = _youtube_items_with_full_descriptions(items_ht)
        ingested += _ingest_youtube_items(db, items_ht)
    return ingested


def ingest_youtube_hashtag_once(db: Session, hashtag: str, limit: int = 15) -> int:
    """Ingest YouTube videos by search query (e.g. safelink / #safelink). Full descriptions fetched for #safelinkapp filter."""
    items = list(poll_youtube_search(query=hashtag.strip().lstrip("#"), limit=limit))
    items = _youtube_items_with_full_descriptions(items)
    return _ingest_youtube_items(db, items)


def _youtube_poll_loop(db_factory, query: str, limit_per_poll: int, interval_sec: int) -> None:
    while not _youtube_stop.is_set():
        db = db_factory()
        try:
            ingest_youtube_once(db, query=query, limit=limit_per_poll)
        except Exception:
            pass
        finally:
            db.close()
        for _ in range(max(1, interval_sec)):
            if _youtube_stop.is_set():
                break
            time.sleep(1)


def start_youtube_polling(db_factory, query: str, limit_per_poll: int = 15, interval_sec: int = 60) -> bool:
    global _youtube_thread
    if _youtube_thread and _youtube_thread.is_alive():
        return False
    _youtube_stop.clear()
    _youtube_thread = threading.Thread(
        target=_youtube_poll_loop,
        args=(db_factory, query, limit_per_poll, interval_sec),
        daemon=True,
    )
    _youtube_thread.start()
    return True


def stop_youtube_polling() -> None:
    _youtube_stop.set()


def youtube_polling_status() -> dict:
    return {"running": bool(_youtube_thread and _youtube_thread.is_alive())}


