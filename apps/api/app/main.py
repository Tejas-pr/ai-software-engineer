from contextlib import asynccontextmanager
from typing import Annotated

import redis
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, text

from app.api.v1.account import router as account_router
from app.api.v1.agent import router as agent_router
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.github import router as github_router
from app.api.v1.organizations import router as organizations_router
from app.api.v1.projects import router as projects_router
from app.api.v1.settings import router as settings_router
from app.api.v1.system import router as system_router
from app.attribution import AUTHOR, AUTHOR_URL, BUILT_BY, REPOSITORY_URL
from app.config import settings
from app.db import get_session
from app.rate_limiter import RateLimiter
from app.redis_client import get_redis


# 1. Lifespan event manager handles startup and shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    # Create all tables defined in SQLModel (ideal for development/Phase 0)
    # SQLModel.metadata.create_all(engine)

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
    title="AI Software Engineer API",
    description=f"Built by {AUTHOR} — {AUTHOR_URL} · source: {REPOSITORY_URL}",
    contact={"name": AUTHOR, "url": AUTHOR_URL},
    lifespan=lifespan,
    # Per client IP. A dashboard page loads several lists at once (the
    # sidebar, overview, runs …), so this has to allow brisk navigation.
    dependencies=[Depends(RateLimiter(requests_limit=300, window_seconds=60))],
)


@app.middleware("http")
async def built_by_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Built-By"] = BUILT_BY
    return response


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
api_v1_router.include_router(account_router)
api_v1_router.include_router(organizations_router)
api_v1_router.include_router(system_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(github_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(agent_router)
api_v1_router.include_router(settings_router)

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
