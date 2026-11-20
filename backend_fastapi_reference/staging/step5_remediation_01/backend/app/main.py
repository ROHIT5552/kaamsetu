"""KaamSetu Backend — Main FastAPI Application Entry Point

Includes:
- Request ID context and middleware
- CORS configuration
- Structured logging with RequestIDFilter
- Global exception handling
- Health check endpoint with database & PostGIS introspection
- Authentication & Role-Based Authorization Module
- Business Domain Modules: Taxonomy, Workers, Employers, Jobs, Applications
"""

import time
import uuid
import logging
import contextvars
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import check_database_health
from app.modules.auth.router import router as auth_router
from app.modules.taxonomy.router import router as taxonomy_router
from app.modules.workers.router import router as worker_router
from app.modules.employers.router import router as employer_router
from app.modules.jobs.router import router as job_router
from app.modules.applications.router import router as application_router
from app.modules.auth.dependencies import (
    require_worker,
    require_employer,
    require_admin,
    AuthenticatedUserContext,
    verify_resource_ownership,
    get_current_user_context
)

# Request ID Context Variable for async task isolation
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIDFilter(logging.Filter):
    """Injects current request ID into all log records automatically."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get("-")
        return True


# Configure structured logging with RequestIDFilter
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter(
    fmt="%(asctime)s [%(levelname)s] [%(name)s] [req_id=%(request_id)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
))
handler.addFilter(RequestIDFilter())

root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
if not any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers):
    root_logger.addHandler(handler)
else:
    for h in root_logger.handlers:
        h.addFilter(RequestIDFilter())

logger = logging.getLogger("kaamsetu.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    logger.info("Initializing KaamSetu API service (env: %s)", settings.APP_ENV)
    # Check initial DB connectivity
    db_health = await check_database_health()
    logger.info("Startup DB check: %s", db_health["message"])
    yield
    logger.info("KaamSetu API service shutting down cleanly")


app = FastAPI(
    title="KaamSetu Marketplace API",
    description="Two-sided Indian worker and employer marketplace backend pilot (Chhatrapati Sambhajinagar)",
    version="0.2.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"]
)


# Request ID & Logging Middleware
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    token = request_id_ctx.set(request_id)
    request.state.request_id = request_id

    start_time = time.perf_counter()
    try:
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s -> %s (%sms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms
        )
        return response
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(
            "Unhandled exception processing %s %s (%sms): %s",
            request.method,
            request.url.path,
            duration_ms,
            str(exc),
            exc_info=settings.DEBUG
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred. Please try again later.",
                    "request_id": request_id
                }
            },
            headers={"X-Request-ID": request_id}
        )
    finally:
        request_id_ctx.reset(token)


# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    req_id = getattr(request.state, "request_id", "-")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "request_id": req_id
            }
        },
        headers={"X-Request-ID": req_id}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", "-")
    sanitized_errors = []
    for err in exc.errors():
        sanitized_errors.append({
            "field": ".".join(str(loc) for loc in err.get("loc", [])),
            "issue": err.get("msg", "Invalid value")
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed",
                "details": sanitized_errors,
                "request_id": req_id
            }
        },
        headers={"X-Request-ID": req_id}
    )


# Mount Authentication & Business Domain Routers
app.include_router(auth_router)
app.include_router(taxonomy_router)
app.include_router(worker_router)
app.include_router(employer_router)
app.include_router(job_router)
app.include_router(application_router)


# Role-Guarded Demonstration Endpoints
@app.get("/api/v1/protected/worker-only", tags=["RBAC Verification"])
async def protected_worker_endpoint(user: AuthenticatedUserContext = Depends(require_worker)):
    return {"message": "Access granted: Worker role verified", "user_id": str(user.user_id)}


@app.get("/api/v1/protected/employer-only", tags=["RBAC Verification"])
async def protected_employer_endpoint(user: AuthenticatedUserContext = Depends(require_employer)):
    return {"message": "Access granted: Employer role verified", "user_id": str(user.user_id)}


@app.get("/api/v1/protected/admin-only", tags=["RBAC Verification"])
async def protected_admin_endpoint(user: AuthenticatedUserContext = Depends(require_admin)):
    return {"message": "Access granted: Administrator role verified", "user_id": str(user.user_id)}


@app.get("/api/v1/protected/resource/{owner_id}", tags=["IDOR Verification"])
async def protected_resource_endpoint(
    owner_id: uuid.UUID,
    user: AuthenticatedUserContext = Depends(get_current_user_context)
):
    verify_resource_ownership(target_owner_id=owner_id, current_user=user, resource_name="personal account data")
    return {"message": "Access granted: Resource ownership verified", "owner_id": str(owner_id)}


# Health Check Endpoint
@app.get("/health", status_code=status.HTTP_200_OK, tags=["System"])
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    db_status = await check_database_health()
    overall_status = "healthy" if db_status["connected"] else "degraded"

    return {
        "status": overall_status,
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "0.2.0",
        "database": {
            "connected": db_status["connected"],
            "engine": db_status["engine_type"],
            "postgis_available": db_status["postgis_available"],
            "postgis_version": db_status["postgis_version"],
            "details": db_status["message"]
        }
    }


# Root informational endpoint
@app.get("/", tags=["System"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "0.2.0",
        "description": "KaamSetu Marketplace API",
        "documentation": "/docs" if settings.APP_ENV != "production" else "Disabled in production",
        "health": "/health"
    }
