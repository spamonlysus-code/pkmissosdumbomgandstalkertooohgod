FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

# Copy backend code, static frontend build, and data directory
COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/
COPY frontend/public/ ./frontend/public/
COPY data/ ./data/

# Low-Memory / 512MB Free Tier Environment Variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1
ENV PYTHONOPTIMIZE=1
ENV CONCURRENT_STUDENT_LIMIT=5

EXPOSE 8000

# Start FastAPI server with a single lightweight worker to minimize RAM footprint
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
