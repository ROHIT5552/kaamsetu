"""Database Connection & Session Management

Provides SQLAlchemy 2.0 asynchronous engine and session factory targeting PostgreSQL + PostGIS.
Provides structured health checking and dialect introspection.
"""

import socket
import logging
from typing import AsyncGenerator, Dict, Any
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncAttrs,
    AsyncEngine
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import settings

logger = logging.getLogger("kaamsetu.database")


class Base(AsyncAttrs, DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass


def is_port_reachable(host: str, port: int, timeout: float = 0.5) -> bool:
    """Fast non-blocking probe to verify network socket availability before engine pool connection."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def create_engine_instance(url: str) -> AsyncEngine:
    """Create async engine with safe connection args per dialect."""
    connect_args = {}
    if "sqlite" in url:
        connect_args["check_same_thread"] = False

    return create_async_engine(
        url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        connect_args=connect_args
    )


# Active default engine (PostgreSQL + PostGIS per settings.DATABASE_URL)
engine = create_engine_instance(settings.DATABASE_URL)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding request-scoped async database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_health(custom_engine: AsyncEngine = None) -> Dict[str, Any]:
    """Performs deep connectivity and capability introspection on the database engine.
    
    Checks:
    - Host and port reachability (fast failover)
    - Basic query execution (SELECT 1)
    - Dialect name (postgresql, sqlite, etc.)
    - PostGIS extension availability (strictly on PostgreSQL)
    """
    target_engine = custom_engine or engine
    dialect = target_engine.dialect.name

    result: Dict[str, Any] = {
        "connected": False,
        "engine_type": dialect,
        "postgis_available": False,
        "postgis_version": None,
        "message": ""
    }

    # Fast probe for PostgreSQL socket to prevent unhandled OS connection hangs
    if dialect == "postgresql":
        host = settings.POSTGRES_HOST
        port = settings.POSTGRES_PORT
        if not is_port_reachable(host, port, timeout=0.5):
            result["connected"] = False
            result["message"] = f"PostgreSQL server at {host}:{port} is unreachable"
            return result

    try:
        async with target_engine.connect() as conn:
            # 1. Connectivity test
            await conn.execute(text("SELECT 1"))
            result["connected"] = True

            # 2. PostGIS validation
            if dialect == "postgresql":
                try:
                    postgis_check = await conn.execute(
                        text("SELECT extversion FROM pg_extension WHERE extname = 'postgis'")
                    )
                    row = postgis_check.fetchone()
                    if row:
                        result["postgis_available"] = True
                        result["postgis_version"] = row[0]
                        result["message"] = f"PostgreSQL connected with PostGIS v{row[0]}"
                    else:
                        result["postgis_available"] = False
                        result["message"] = "PostgreSQL connected, but PostGIS extension is not enabled in database"
                except Exception as pg_err:
                    logger.warning("Could not query PostGIS extension status: %s", str(pg_err))
                    result["message"] = "PostgreSQL connected; PostGIS query failed"
            elif dialect == "sqlite":
                result["postgis_available"] = False
                result["message"] = "Running on SQLite (PostGIS is not supported on SQLite)"
            else:
                result["postgis_available"] = False
                result["message"] = f"Running on {dialect} (PostGIS unavailable)"

    except Exception as exc:
        logger.warning("Database connectivity check failed: %s", str(exc))
        result["connected"] = False
        result["message"] = "Database connection could not be established"

    return result
