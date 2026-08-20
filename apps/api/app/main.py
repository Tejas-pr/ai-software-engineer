from contextlib import asynccontextmanager
from typing import Annotated

import redis
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, text

from app.api.v1.auth import router as auth_router
from app.api.v1.system import router as system_router
from app.config import settings
from app.db import engine, get_session
from app.rate_limiter import RateLimiter
from app.redis_client import get_redis


# 1. Lifespan event manager handles startup and shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    # Create all tables defined in SQLModel (ideal for development/Phase 0)
    SQLModel.metadata.create_all(engine)

    # Initialize the Redis connection pool and store it in app state
    app.state.redis_pool = redis.ConnectionPool(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        decode_responses=True,
    )

    yield

    # --- SHUTDOWN ---
    # Properly close the Redis connection pool
    app.state.redis_pool.disconnect()


# 2. Instantiate FastAPI with the lifespan
app = FastAPI(
    lifespan=lifespan,
    dependencies=[Depends(RateLimiter(requests_limit=60, window_seconds=60))],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)

# API Versioning: Create a v1 router and include sub-routers
api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(system_router)

# Include the versioned router in the main FastAPI app
app.include_router(api_v1_router)

# Define Dependency Type Aliases for the health check
SessionDep = Annotated[Session, Depends(get_session)]
RedisDep = Annotated[redis.Redis, Depends(get_redis)]


@app.get("/health")
def health_check(session: SessionDep, redis_client: RedisDep):
    status = {
        "status": "healthy",
        "database": "untested",
        "redis": "untested",
    }
    is_healthy = True

    # 1. Test database connection
    try:
        session.execute(text("SELECT 1")).scalar()
        status["database"] = "healthy"
    except Exception as e:  # noqa: BLE001
        status["database"] = f"unhealthy: {e!s}"
        is_healthy = False

    # 2. Test Redis connection
    try:
        redis_client.ping()
        status["redis"] = "healthy"
    except Exception as e:  # noqa: BLE001
        status["redis"] = f"unhealthy: {e!s}"
        is_healthy = False

    if not is_healthy:
        status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail=status)

    return status
