from typing import Annotated

import redis
from fastapi import Depends, HTTPException, Request

from app.redis_client import get_redis


class RateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        """
        requests_limit: Maximum number of requests allowed in the time window.
        window_seconds: The length of the time window in seconds.
        """
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds

    def __call__(
        self, request: Request, redis_client: Annotated[redis.Redis, Depends(get_redis)]
    ):
        # 1. Identify the client by their IP address (or authorization header/user ID)
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"

        # 2. Increment request count (atomic operation in Redis)
        current_requests = redis_client.incr(key)

        # 3. If it is the first request in the window, set key expiration
        if current_requests == 1:
            redis_client.expire(key, self.window_seconds)

        # 4. Check if limit is exceeded
        if current_requests > self.requests_limit:
            # Get remaining time to reset the window
            ttl = redis_client.ttl(key)
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded. Try again in {ttl} seconds.",
                    "retry_after_seconds": ttl,
                },
            )
