from typing import Annotated

import redis
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, text

from app.db import get_session
from app.redis_client import get_redis

# Create the system router without a prefix so the endpoints map directly under /api/v1/
router = APIRouter(tags=["system"])

SessionDep = Annotated[Session, Depends(get_session)]
RedisDep = Annotated[redis.Redis, Depends(get_redis)]


@router.get("/db-test")
def test_db(session: SessionDep):
    try:
        # Execute a simple raw SQL query
        result = session.execute(text("SELECT 1")).scalar()
        return {"status": "success", "db_response": result}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Database connection failed: {e!s}"
        )


@router.get("/redis-test")
def test_redis(redis_client: RedisDep):
    try:
        # Set and get a key in Redis
        redis_client.set("test_key", "FastAPI setup complete!", ex=10)  # 10s expiration
        val = redis_client.get("test_key")
        return {"status": "success", "redis_response": val}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Redis connection failed: {e!s}")
