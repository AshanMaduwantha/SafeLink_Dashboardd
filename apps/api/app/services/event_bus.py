import json
from typing import Callable

import redis

from app.core.config import get_settings

CHANNEL_ALERTS = "alerts:new"


def publish_alert(payload: dict) -> None:
    settings = get_settings()
    client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    client.publish(CHANNEL_ALERTS, json.dumps(payload))


def subscribe_alerts(on_message: Callable[[dict], None]) -> None:
    settings = get_settings()
    client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    pubsub = client.pubsub(ignore_subscribe_messages=True)
    pubsub.subscribe(CHANNEL_ALERTS)
    for message in pubsub.listen():
        if message.get("type") != "message":
            continue
        data = message.get("data")
        if not data:
            continue
        try:
            payload = json.loads(data)
            on_message(payload)
        except Exception:
            continue
