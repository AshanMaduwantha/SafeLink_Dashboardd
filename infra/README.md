# Backend (Social Media / Harmful Content Detector API)

This runs the **API on http://localhost:8000** used by the dashboard’s **Social Media** tab.

## Prerequisites

- **Docker** and **Docker Compose** (Docker Desktop on Mac)

## Run from repo root

```bash
# Start backend (Postgres, Redis, API, Worker)
npm run dev:backend

# Optional: seed admin user (email: admin@example.com, password: admin12345)
./scripts/seed-hcd-backend.sh

# Stop backend
npm run dev:backend:down

# View API logs
npm run dev:backend:logs
```

## Run full stack (backend + dashboard)

1. **Terminal 1:** `npm run dev:backend`  
2. **(Optional)** `./scripts/seed-hcd-backend.sh`  
3. **Terminal 2:** `npm run dev`  
4. Open **http://localhost:3000** → use **Social Media** tab (API at http://localhost:8000).

## Env vars

Backend reads from the repo root **`.env`**. See **`.env.example`** for HCD-related variables (`JWT_SECRET`, `DEMO_MODE`, `YOUTUBE_API_KEY`, etc.). The dashboard uses `NEXT_PUBLIC_HCD_API_BASE_URL=http://localhost:8000`.

## Models / data (NLP + YOLO)

The backend expects **`models/`** (NLP + YOLO) and **`data/`** (keywords, demo inputs) at the repo root. These were **not** copied from the original project because:

- **Size**: NLP weights (e.g. `model.safetensors`) and training artifacts can be **several GB**. Copying would duplicate large binaries and is usually avoided in git.
- **DEMO_MODE**: With `DEMO_MODE=true` in `.env`, the API runs without real models for basic testing.

To use the **same models as the original project** (no duplication):

```bash
# From SafeLink_Dashboardd repo root
./scripts/link-hcd-models.sh
```

This script **symlinks** `models` and `data` to the harmful-content-detector project (default: `../../Testing/harmful-content-detector`). Override with:

```bash
export HCD_SOURCE=/path/to/harmful-content-detector
./scripts/link-hcd-models.sh
```

To **copy** models instead (e.g. to make SafeLink self-contained), copy the contents of the original project’s `models/` and `data/` into this repo’s `models/` and `data/` (e.g. via Finder or `cp -r`). Expect ~3GB+ for the full NLP model set.
