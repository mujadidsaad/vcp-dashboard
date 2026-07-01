# Backend container for the VCP Screener.
# Works on Render, Fly.io, Railway, Google Cloud Run, and any Docker host.

FROM python:3.11-slim

# System deps for numpy/pandas/curl_cffi
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cache layer)
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy code + data (data.csv + NSE index CSVs live in /repo/data)
COPY backend/app /app/app
COPY data /data

# Point the app at /data so container paths resolve correctly.
# app/universe.py + app/main.py compute paths relative to backend/, so we
# create a symlink to keep those imports happy.
RUN mkdir -p /repo/backend /repo/data && \
    ln -s /app/app /repo/backend/app && \
    ln -s /data /repo/data

WORKDIR /repo/backend

ENV PYTHONUNBUFFERED=1

# Render/Fly/Cloud Run inject PORT env var. Default to 8000 locally.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]