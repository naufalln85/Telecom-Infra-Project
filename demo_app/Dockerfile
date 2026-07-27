FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from root directory
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY demo_app/ /app/demo_app/
COPY .env /app/.env

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "demo_app.main:app", "--host", "0.0.0.0", "--port", "8000"]
