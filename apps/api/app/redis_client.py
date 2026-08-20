from collections.abc import Generator

import redis
from fastapi import Request
from redis import Redis


# Dependency to get a Redis client from the connection pool
def get_redis(request: Request) -> Generator[Redis]:
    # request.app.state holds application-wide state (initialized in lifespan)
    client = redis.Redis(connection_pool=request.app.state.redis_pool)
    try:
        yield client
    finally:
        # Closing the client returns the connection to the pool (does not close the pool)
        client.close()
