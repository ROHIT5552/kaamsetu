# KaamSetu Backend — Development Setup & Execution Guide

This document describes how to set up, configure, run, and test the KaamSetu FastAPI backend service targeting PostgreSQL + PostGIS.

---

## 1. Prerequisites

- **Python 3.12+**
- **Docker & Docker Compose** (for running PostgreSQL 16 + PostGIS 3.4 container)
- **PowerShell / Bash**

---

## 2. Environment Setup

### A. Create Project-Local Virtual Environment
```powershell
cd C:\Users\ajay\.gemini\antigravity\scratch\kaamsetu\backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (PowerShell)
.\.venv\Scripts\Activate.ps1

# (On Linux / macOS)
# source .venv/bin/activate
```

### B. Install Dependencies
```powershell
pip install -r requirements.txt
```

### C. Configure Environment Variables
Copy the template configuration to `.env`:
```powershell
cp .env.example .env
```
Key configuration parameters in `.env`:
- `DATABASE_URL`: `postgresql+asyncpg://kaamsetu_user:kaamsetu_secure_dev_password@localhost:5432/kaamsetu_db`
- `DATABASE_URL_SYNC`: `postgresql://kaamsetu_user:kaamsetu_secure_dev_password@localhost:5432/kaamsetu_db`
- `SECRET_KEY`: Random 32+ character key for cryptographic token signing.
- `APP_ENV`: `development` | `staging` | `production`

---

## 3. Database Services (PostgreSQL 16 + PostGIS 3.4)

Start the containerized PostgreSQL + PostGIS instance:
```powershell
docker compose up -d db
```

Verify the database container is healthy:
```powershell
docker compose ps
```

The database container includes:
- **Engine:** PostgreSQL 16
- **Extension:** PostGIS 3.4
- **Default Database:** `kaamsetu_db`
- **Default User:** `kaamsetu_user`
- **Port:** `5432`
- **Persistence:** Docker named volume `kaamsetu_postgres_data`

---

## 4. Running the Backend Locally

Run the development server with live reload:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Or using the full virtual environment path:
```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 5. Health Check & API Documentation

- **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)
  - Returns service status (`healthy` or `degraded`), database connectivity, dialect engine, and PostGIS extension status.
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

Sample `/health` response:
```json
{
  "status": "healthy",
  "service": "KaamSetu-Backend",
  "environment": "development",
  "version": "0.2.0",
  "database": {
    "connected": true,
    "engine": "postgresql",
    "postgis_available": true,
    "postgis_version": "3.4.2",
    "details": "PostgreSQL connected with PostGIS v3.4.2"
  }
}
```

---

## 6. Running the Test Suite

Execute automated pytest tests:
```powershell
pytest -v
```

Or with full path:
```powershell
.\.venv\Scripts\pytest.exe -v
```
