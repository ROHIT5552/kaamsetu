"""Unit and Integration Tests for Health Endpoint & Core Middleware"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings


@pytest.mark.asyncio
async def test_health_endpoint_structure():
    """Verify GET /health returns 200 with required keys and no secret leakage."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()

        # Required fields per Step 2 specification
        assert "status" in data
        assert "service" in data
        assert "environment" in data
        assert "database" in data

        db = data["database"]
        assert "connected" in db
        assert "engine" in db
        assert "postgis_available" in db
        assert "details" in db

        # Verify no credentials or internal file paths leak
        content_str = response.text
        assert "password" not in content_str.lower()
        assert "secret" not in content_str.lower()
        assert "C:\\" not in content_str
        assert "/app/" not in content_str


@pytest.mark.asyncio
async def test_request_id_middleware():
    """Verify request ID is generated and returned in header."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 10


@pytest.mark.asyncio
async def test_root_endpoint():
    """Verify root endpoint returns system metadata."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == settings.APP_NAME
        assert "health" in data
