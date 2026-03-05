# Social Media (Harmful Content Detector) – Troubleshooting

## Why YouTube posts are not coming

The dashboard “Fetch new posts” calls the backend at `http://localhost:8000`. YouTube ingest **requires**:

1. **`YOUTUBE_API_KEY`** in the repo root **`.env`** (used by the backend when you run `npm run dev:backend`).
   - If this is missing or empty, the API returns an error and no videos are fetched.
   - Get a key from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create API Key, and enable **YouTube Data API v3**.

2. **Check configuration**  
   Open **http://localhost:8000/ingest/status** (in the browser or via curl). It returns:
   - `youtube_configured: true/false`
   - `facebook_configured: true/false`
   - `twitter_configured: true/false`  
   If `youtube_configured` is `false`, add `YOUTUBE_API_KEY` to `.env` and restart the backend.

3. **Quota / errors**  
   If the key is set but you still get no results, check the dashboard “Fetch new posts” result (e.g. “Quota exceeded” or an error message). You can also call the API debug endpoint:  
   **GET** `http://localhost:8000/ingest/youtube/debug?query=Sri%20Lanka&limit=5`  
   The response shows whether the YouTube API is reachable and if there are quota/errors.

---

## Why Facebook posts are not coming

Facebook ingest **requires**:

1. **`FACEBOOK_PAGE_ACCESS_TOKEN`** in `.env`  
   - A Page Access Token (not a User Access Token) with permission to read the page’s posts.

2. **`FACEBOOK_PAGE_IDS`** in `.env`  
   - Comma-separated list of Facebook Page IDs to pull posts from (e.g. `123456789,987654321`).

If either is missing, the API will not fetch Facebook posts. Check **http://localhost:8000/ingest/status**: `facebook_configured` should be `true` and `facebook_page_count` > 0.

---

## Why Facebook (or other) posts are not creating alerts

Posts are **ingested** first, then **analyzed** by a background worker. An **alert** is only created if the analysis **fusion score** is at or above the **alert threshold** (default **70**).

### 1. Celery worker must be running

Analysis runs in the **Celery worker**, not in the API process. If the worker is not running:

- Posts appear in the **Posts** tab (ingestion works).
- No analysis runs, so no alerts are created.

**Fix:** Start the full backend stack so the worker is running:

```bash
npm run dev:backend
```

This starts Postgres, Redis, API, **and** the Celery worker. Check Docker: you should see a container like `safelink-hcd-worker`. If you only run the API (e.g. uvicorn) without the worker, alerts will not be created.

### 2. Fusion score below threshold

Alerts are created only when **fusion_score ≥ ALERT_THRESHOLD** (default **70**). So:

- **Text-only posts** (e.g. most Facebook posts): only the **text (NLP)** model (or keyword/heuristic) is used. If the text does not match harmful keywords or the model gives low scores, the fusion score stays below 70 and **no alert** is created.
- **Videos** (e.g. YouTube after download): text + video (YOLO) + audio (Whisper) are combined. Strong detections in any modality can push the score above 70.

So “no alert” for a given post often means the model scores for that content were below the threshold, not that the pipeline is broken.

### 3. Models and paths

For **real** (non-heuristic) scoring:

- **NLP model**: `models/nlp/` (e.g. `model.safetensors` + `infer.py` or HuggingFace-style model).  
  Config: `NLP_MODEL_PATH`, `NLP_ADAPTER_PATH` in `.env` (container paths, e.g. `/app/models/nlp`).
- **YOLO**: `models/yolo/weights.pt`.  
  Config: `YOLO_WEIGHTS_PATH` (e.g. `/app/models/yolo/weights.pt`).
- **Keywords**: `data/keywords/en.txt`, `data/keywords/si.txt` for the keyword prefilter.

If these are missing or wrong, the pipeline may fall back to a **heuristic** (keyword-based) or low scores, so fewer alerts. Ensure you have run `./scripts/link-hcd-models.sh` (or copied `models/` and `data/` from the original project) and that the backend mounts the same paths (e.g. in `infra/docker-compose.yml`).

### 4. Optional: lower threshold for testing

To see more alerts in development, you can lower the threshold in `.env`:

```env
ALERT_THRESHOLD=50
```

Restart the backend after changing `.env`.

---

## Quick checklist

| Issue | Check |
|-------|--------|
| YouTube posts not coming | `YOUTUBE_API_KEY` in `.env`; **GET** `/ingest/status` → `youtube_configured: true` |
| Facebook posts not coming | `FACEBOOK_PAGE_ACCESS_TOKEN` and `FACEBOOK_PAGE_IDS` in `.env`; `/ingest/status` → `facebook_configured: true` |
| Posts show in Posts tab but no alerts | Celery **worker** running (`npm run dev:backend`); fusion score ≥ `ALERT_THRESHOLD` (default 70) |
| Models not loading | `models/` and `data/` present (link or copy); `NLP_MODEL_PATH`, `YOLO_WEIGHTS_PATH` correct in `.env` |

---

## Useful endpoints

- **GET** `http://localhost:8000/health` – API up.
- **GET** `http://localhost:8000/ingest/status` – Which ingest sources are configured (no secrets).
- **GET** `http://localhost:8000/ingest/youtube/debug?query=Sri%20Lanka&limit=5` – Test YouTube API.
- **GET** `http://localhost:8000/docs` – Full API docs.
