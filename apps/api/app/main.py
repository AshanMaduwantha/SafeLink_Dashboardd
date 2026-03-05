import asyncio
import re
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings
from app.db.session import Base, SessionLocal, engine
from app.routers import alerts, debug, ingest, users, ws
from app.services.event_bus import subscribe_alerts
from app.services.ingestion import (
    start_demo_folder_watcher,
    start_facebook_polling,
    start_twitter_polling,
    start_youtube_polling,
)
from app.services.ws_manager import ws_manager

settings = get_settings()

# Allowed origins for CORS (localhost / 127.0.0.1 on any port)
_CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] + [o for o in (settings.cors_origins_list or []) if o not in ("http://localhost:5173", "http://127.0.0.1:5173")]
_CORS_ORIGIN_REGEX = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", re.I)


def _cors_allow_origin(origin: str | None) -> str | None:
    if not origin:
        return _CORS_ALLOWED_ORIGINS[0] if _CORS_ALLOWED_ORIGINS else None
    if origin in _CORS_ALLOWED_ORIGINS:
        return origin
    if _CORS_ORIGIN_REGEX.match(origin):
        return origin
    return None


class ForceCORSHeadersMiddleware(BaseHTTPMiddleware):
    """Ensure CORS headers are on every response so browser never blocks."""

    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            response = await call_next(request)
        except HTTPException as he:
            import json
            response = Response(
                content=json.dumps({"detail": he.detail}),
                status_code=he.status_code,
                media_type="application/json",
            )
        except Exception as exc:
            # App crashed: return 500 WITH CORS so browser doesn't report "blocked by CORS"
            import logging
            logging.getLogger(__name__).exception("Unhandled exception: %s", exc)
            response = Response(
                content='{"detail":"Internal server error"}',
                status_code=500,
                media_type="application/json",
            )
        origin = request.headers.get("origin")
        allow = _cors_allow_origin(origin)
        if allow:
            response.headers["Access-Control-Allow-Origin"] = allow
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = "*"
        return response


def _start_alert_subscription(loop: asyncio.AbstractEventLoop) -> None:
    def _on_message(payload: dict) -> None:
        asyncio.run_coroutine_threadsafe(ws_manager.broadcast_json(payload), loop)

    def _run() -> None:
        subscribe_alerts(_on_message)

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


def _auto_start_ingest_polling() -> None:
    """Start Twitter, YouTube, and Facebook background polling when credentials are configured."""
    if settings.twitter_bearer_token:
        start_twitter_polling(
            SessionLocal,
            query=settings.twitter_search_query(),
            limit_per_poll=20,
            interval_sec=settings.twitter_poll_interval_sec,
        )
    if settings.youtube_api_key:
        start_youtube_polling(
            SessionLocal,
            query=settings.youtube_default_query,
            limit_per_poll=15,
            interval_sec=settings.youtube_poll_interval_sec,
        )
    if settings.facebook_page_access_token:
        page_ids = [p.strip() for p in (settings.facebook_page_ids or "").split(",") if p.strip()]
        if page_ids:
            start_facebook_polling(
                SessionLocal,
                page_ids=page_ids,
                limit_per_page=20,
                interval_sec=settings.facebook_poll_interval_sec,
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    Path(settings.media_root).mkdir(parents=True, exist_ok=True)
    Path(settings.demo_input_dir).mkdir(parents=True, exist_ok=True)
    loop = asyncio.get_running_loop()
    _start_alert_subscription(loop)
    if settings.demo_mode:
        start_demo_folder_watcher(SessionLocal)
    _auto_start_ingest_polling()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
# Always allow localhost / 127.0.0.1 on any port for dev; add configured origins
_cors_origins = list(settings.cors_origins_list) if settings.cors_origins_list else []
_dev_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
for o in _dev_origins:
    if o not in _cors_origins:
        _cors_origins.append(o)
# Regex: allow any http(s) from localhost or 127.0.0.1 (any port)
_origin_regex = r"https?://(localhost|127\.0\.0\.1)(:\d+)?$"
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
# Run last so it runs first on response: guarantee CORS headers on every response
app.add_middleware(ForceCORSHeadersMiddleware)

app.include_router(alerts.router)
app.include_router(ingest.router)
app.include_router(users.router)
app.include_router(debug.router)
app.include_router(ws.router)
app.mount("/storage", StaticFiles(directory=settings.media_root), name="storage")


@app.get("/health")
def health():
    return {"status": "ok"}
