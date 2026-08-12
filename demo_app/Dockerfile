FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (termasuk psycopg2 untuk Alembic sync)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements dari root directory
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh project (backend + alembic + DB Relation schema)
COPY demo_app/ /app/demo_app/
COPY db/ /app/db/
COPY alembic.ini /app/alembic.ini
COPY .env /app/.env

# Copy entrypoint script dan beri execute permission
COPY demo_app/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Jalankan entrypoint: migrate → seed → start server
CMD ["/app/entrypoint.sh"]
