from contextlib import asynccontextmanager
from typing import Annotated

import redis
from fastapi import Depends, FastAPI, HTTPException
from sqlmodel import Session, SQLModel, text

from app.config import settings
from app.db import engine, get_session
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
        decode_responses=True
    )
    
    yield
    
    # --- SHUTDOWN ---
    # Properly close the Redis connection pool
    app.state.redis_pool.disconnect()

# 2. Instantiate FastAPI with the lifespan
app = FastAPI(lifespan=lifespan)

# Define Dependency Type Aliases for clean signatures (FastAPI best practice)
SessionDep = Annotated[Session, Depends(get_session)]
RedisDep = Annotated[redis.Redis, Depends(get_redis)]

@app.get("/")
def read_root():
    return {"Hello": "World"}

# 3. Test endpoint to verify PostgreSQL connection
@app.get("/db-test")
def test_db(session: SessionDep):
    try:
        # Execute a simple raw SQL query
        result = session.execute(text("SELECT 1")).first()
        return {"status": "success", "db_response": result}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e!s}")

# 4. Test endpoint to verify Redis connection
@app.get("/redis-test")
def test_redis(redis_client: RedisDep):
    try:
        # Set and get a key in Redis
        redis_client.set("test_key", "FastAPI setup complete!", ex=10) # 10s expiration
        val = redis_client.get("test_key")
        return {"status": "success", "redis_response": val}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Redis connection failed: {e!s}")
