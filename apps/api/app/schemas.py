from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = "MODERATOR"


class AlertSummary(BaseModel):
    id: int
    post_id: int
    category: str
    severity: str
    fusion_score: float
    status: str
    created_at: datetime


class AlertDetail(BaseModel):
    id: int
    status: str
    assigned_to: Optional[int]
    created_at: datetime
    updated_at: datetime
    post: Dict[str, Any]
    analysis: Dict[str, Any]


class AlertPatchRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[int] = None


class FeedbackRequest(BaseModel):
    decision: str
    corrected_category: Optional[str] = None
    notes: Optional[str] = None


class IngestDemoRequest(BaseModel):
    platform: str = "demo"
    platform_post_id: str
    text: Optional[str] = None
    author: Optional[str] = None
    url: Optional[str] = None
    raw_json: Dict[str, Any] = Field(default_factory=dict)
    media_paths: List[str] = Field(default_factory=list)


class ReplayStartRequest(BaseModel):
    speed: float = 1.0
    limit: int = 100


class TwitterStreamStartRequest(BaseModel):
    query: Optional[str] = None
    limit_per_poll: int = 20
    interval_sec: int = 30


class FacebookStreamStartRequest(BaseModel):
    page_ids: Optional[List[str]] = None
    limit_per_page: int = 20
    interval_sec: int = 60


class YouTubeStreamStartRequest(BaseModel):
    query: Optional[str] = None
    limit_per_poll: int = 15
    interval_sec: int = 60


class DebugModelCheckRequest(BaseModel):
    text: str = ""
    lang: Optional[str] = None
    video_path: Optional[str] = None
    run_audio: bool = True
