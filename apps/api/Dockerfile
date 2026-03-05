FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=180
ENV PIP_RETRIES=10
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN set -eux; \
    python -m pip install --no-cache-dir --upgrade pip setuptools wheel; \
    for attempt in 1 2 3; do \
      python -m pip install --no-cache-dir \
        --index-url https://pypi.org/simple \
        --trusted-host pypi.org \
        --trusted-host files.pythonhosted.org \
        --retries 20 \
        --timeout 240 \
        -r /app/requirements.txt && break; \
      echo "pip install failed (attempt ${attempt}), retrying..."; \
      if [ "$attempt" -eq 3 ]; then \
        echo "pip install failed after 3 attempts"; \
        exit 1; \
      fi; \
      sleep 5; \
    done

COPY app /app/app
COPY tests /app/tests

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
