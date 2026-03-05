#!/usr/bin/env bash
# Seed admin user for the Harmful Content Detector API (Social Media backend).
# Run after: npm run dev:backend
# From repo root: ./scripts/seed-hcd-backend.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Waiting for API at http://localhost:8000/health..."
MAX_TRIES=30
TRIES=0
until curl -sSf "http://localhost:8000/health" >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "API did not become healthy. Start it with: npm run dev:backend"
    exit 1
  fi
  sleep 2
done

echo "==> Seeding admin user..."
docker compose -f infra/docker-compose.yml exec -T api python - <<'PY'
from datetime import datetime
from app.core.security import hash_password
from app.db.models import User, UserRole
from app.db.session import SessionLocal

email = "admin@example.com"
password = "admin12345"

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"Admin already exists: {email}")
    else:
        db.add(
            User(
                email=email,
                password_hash=hash_password(password),
                role=UserRole.ADMIN,
                created_at=datetime.utcnow(),
            )
        )
        db.commit()
        print(f"Seeded admin user: {email}")
finally:
    db.close()
PY

echo ""
echo "Admin: admin@example.com / admin12345"
