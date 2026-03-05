from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root .env so API works when run from apps/api or from Docker (compose injects env)
_CONFIG_DIR = Path(__file__).resolve().parent
# app/core -> app -> api -> apps -> repo root (4 parents)
_ROOT_ENV = _CONFIG_DIR.parent.parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ROOT_ENV) if _ROOT_ENV.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Harmful Content Detector API"
    database_url: str = "postgresql+psycopg2://hcd_user:hcd_password@localhost:5432/harmful_content"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change_me_super_secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120
    demo_mode: bool = True
    twitter_bearer_token: str = ""
    twitter_default_query: str = ""
    twitter_hashtags: str = "safelink,slpolice,srilanka"
    twitter_poll_interval_sec: int = 30
    facebook_page_access_token: str = ""
    facebook_page_ids: str = ""
    facebook_hashtags: str = "safelink,slpolice,srilanka"
    primary_hashtag: str = "safelinkapp"
    require_two_hashtags: bool = False
    facebook_poll_interval_sec: int = 60
    youtube_api_key: str = ""
    youtube_default_query: str = "Sri Lanka violence OR Sri Lanka abuse OR Sri Lanka news"
    youtube_hashtags: str = "safelink,slpolice,srilanka"
    youtube_region_code: str = "lk"
    youtube_order: str = "date"
    youtube_poll_interval_sec: int = 120
    yolo_weights_path: str = "/app/models/yolo/weights.pt"
    nlp_model_path: str = "/app/models/nlp"
    nlp_adapter_path: str = "/app/models/nlp/infer.py"
    nlp_label_map_json: str = ""
    whisper_model: str = "small"
    violence_class_keywords: str = "knife,gun,weapon,fight,blood,violence"
    fusion_text_w: float = 0.4
    fusion_video_w: float = 0.4
    fusion_audio_w: float = 0.2
    alert_threshold: int = 70
    media_root: str = "/app/storage"
    demo_input_dir: str = "/app/data/demo_inputs"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        if not origins:
            return ["http://localhost:5173", "http://127.0.0.1:5173"]
        return origins

    @property
    def violence_class_keywords_list(self) -> List[str]:
        return [value.strip().lower() for value in self.violence_class_keywords.split(",") if value.strip()]

    @property
    def youtube_hashtags_list(self) -> List[str]:
        return [h.strip().lstrip("#") for h in self.youtube_hashtags.split(",") if h.strip()]

    @property
    def facebook_hashtags_list(self) -> List[str]:
        return [h.strip().lstrip("#") for h in self.facebook_hashtags.split(",") if h.strip()]

    @property
    def twitter_hashtags_list(self) -> List[str]:
        return [h.strip().lstrip("#") for h in self.twitter_hashtags.split(",") if h.strip()]

    def twitter_search_query(self) -> str:
        """Build Twitter search query from primary_hashtag + twitter_hashtags (same hashtags as other platforms)."""
        if self.twitter_default_query.strip():
            return self.twitter_default_query.strip()
        primary = (self.primary_hashtag or "").strip().lstrip("#")
        tags = self.twitter_hashtags_list
        if primary and primary not in [t.lower() for t in tags]:
            tags = [primary] + [t for t in tags if t.lower() != primary.lower()]
        if not tags:
            return "(lang:en OR lang:si)"
        hashtag_terms = " OR ".join(f"#{t}" for t in tags)
        return f"({hashtag_terms}) (lang:en OR lang:si)"


@lru_cache
def get_settings() -> Settings:
    return Settings()
