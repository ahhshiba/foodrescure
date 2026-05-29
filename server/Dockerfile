FROM python:3.11-slim

# System deps: build tools for asyncpg/bcrypt wheels are usually unneeded
# (manylinux wheels exist), but libpq isn't required for asyncpg. Keep slim.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8000 5678

# Default command (overridable in compose). debugpy listens on 5678 for VS Code attach.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
