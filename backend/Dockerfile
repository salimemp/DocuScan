# DocScan Pro Backend — Production Dockerfile
# Multi-stage build optimized for Railway / Render / Fly.io.
# Uses dynamic $PORT (required by Railway), proper health endpoint, and libjpeg for Pillow.

# ─── Stage 1: Builder ──────────────────────────────────────────
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /install

COPY requirements.txt .
# emergentintegrations is hosted on Emergent's private index, not PyPI.
# Use --extra-index-url so pip falls back to PyPI for everything else.
RUN pip install --upgrade pip \
    && pip install --prefix=/install/deps \
        --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ \
        -r requirements.txt

# ─── Stage 2: Runtime ──────────────────────────────────────────
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8001

# Runtime libs for opencv-headless + Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libjpeg62-turbo \
    zlib1g \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /install/deps /usr/local

# Non-root user for security
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app
COPY --chown=appuser:appuser . .
USER appuser

EXPOSE 8001

# Health check uses the new /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail http://localhost:${PORT}/health || exit 1

# Use shell form so $PORT expansion works (Railway injects this dynamically)
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT} --workers 1
