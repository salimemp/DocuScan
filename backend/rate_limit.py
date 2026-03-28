"""
Rate Limiting and Bot Protection utilities for DocScan Pro
"""
import time
import hashlib
import aiohttp
from typing import Dict, Optional, Tuple
from collections import defaultdict
from fastapi import Request, HTTPException
from functools import wraps
import os

# Rate limiting storage (in production, use Redis)
rate_limit_storage: Dict[str, Dict[str, any]] = defaultdict(lambda: {"count": 0, "reset_time": 0})

# Cloudflare Turnstile configuration
TURNSTILE_SECRET_KEY = os.environ.get('TURNSTILE_SECRET_KEY', '')
TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

class RateLimiter:
    """
    Simple in-memory rate limiter.
    For production, replace with Redis-based solution.
    """
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier from request"""
        # Try to get real IP from headers (behind proxy)
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            ip = forwarded_for.split(',')[0].strip()
        else:
            ip = request.client.host if request.client else 'unknown'
        
        # Also consider user agent for fingerprinting
        user_agent = request.headers.get('User-Agent', '')
        fingerprint = f"{ip}:{hashlib.md5(user_agent.encode()).hexdigest()[:8]}"
        return fingerprint
    
    def _cleanup_old_requests(self, client_id: str, window_seconds: int):
        """Remove requests older than the window"""
        current_time = time.time()
        self.requests[client_id] = [
            t for t in self.requests[client_id]
            if current_time - t < window_seconds
        ]
    
    def check_rate_limit(
        self,
        request: Request,
        limit: int = 60,
        window_seconds: int = 60,
        endpoint: str = "default"
    ) -> Tuple[bool, Dict]:
        """
        Check if request is within rate limit.
        
        Args:
            request: FastAPI request object
            limit: Maximum number of requests allowed
            window_seconds: Time window in seconds
            endpoint: Endpoint identifier for separate limits
        
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        client_id = f"{self._get_client_id(request)}:{endpoint}"
        current_time = time.time()
        
        # Cleanup old requests
        self._cleanup_old_requests(client_id, window_seconds)
        
        # Get current count
        request_count = len(self.requests[client_id])
        
        # Calculate remaining and reset time
        remaining = max(0, limit - request_count)
        
        if self.requests[client_id]:
            oldest_request = min(self.requests[client_id])
            reset_time = int(oldest_request + window_seconds - current_time)
        else:
            reset_time = window_seconds
        
        rate_limit_info = {
            "limit": limit,
            "remaining": remaining,
            "reset": max(0, reset_time),
            "window": window_seconds
        }
        
        if request_count >= limit:
            return False, rate_limit_info
        
        # Record this request
        self.requests[client_id].append(current_time)
        rate_limit_info["remaining"] = remaining - 1
        
        return True, rate_limit_info
    
    def get_rate_limit_headers(self, info: Dict) -> Dict[str, str]:
        """Generate rate limit headers for response"""
        return {
            "X-RateLimit-Limit": str(info["limit"]),
            "X-RateLimit-Remaining": str(info["remaining"]),
            "X-RateLimit-Reset": str(info["reset"]),
            "X-RateLimit-Window": str(info["window"])
        }


# Global rate limiter instance
rate_limiter = RateLimiter()


async def verify_turnstile_token(token: str, ip: Optional[str] = None) -> Tuple[bool, Dict]:
    """
    Verify Cloudflare Turnstile token.
    
    Args:
        token: The turnstile token from client
        ip: Optional client IP for additional verification
    
    Returns:
        Tuple of (is_valid, response_data)
    """
    if not TURNSTILE_SECRET_KEY:
        # If no secret key configured, skip verification (dev mode)
        return True, {"success": True, "message": "Turnstile verification skipped (no secret key)"}
    
    try:
        form_data = {
            'secret': TURNSTILE_SECRET_KEY,
            'response': token,
        }
        
        if ip:
            form_data['remoteip'] = ip
        
        async with aiohttp.ClientSession() as session:
            async with session.post(TURNSTILE_VERIFY_URL, data=form_data) as response:
                result = await response.json()
                
                if result.get('success'):
                    return True, result
                else:
                    return False, {
                        "success": False,
                        "error_codes": result.get('error-codes', []),
                        "message": "Turnstile verification failed"
                    }
    except Exception as e:
        return False, {
            "success": False,
            "error": str(e),
            "message": "Turnstile verification error"
        }


def rate_limit(limit: int = 60, window: int = 60, endpoint: Optional[str] = None):
    """
    Decorator for rate limiting endpoints.
    
    Args:
        limit: Maximum requests per window
        window: Time window in seconds
        endpoint: Optional endpoint name (defaults to function name)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request in args/kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if not request:
                request = kwargs.get('request')
            
            if request:
                ep = endpoint or func.__name__
                allowed, info = rate_limiter.check_rate_limit(
                    request, limit=limit, window_seconds=window, endpoint=ep
                )
                
                if not allowed:
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "Too many requests",
                            "retry_after": info["reset"],
                            "limit": info["limit"]
                        },
                        headers=rate_limiter.get_rate_limit_headers(info)
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    "auth": {"limit": 10, "window": 60},      # 10 auth requests per minute
    "api": {"limit": 100, "window": 60},      # 100 API requests per minute
    "upload": {"limit": 20, "window": 60},    # 20 uploads per minute
    "ai": {"limit": 30, "window": 60},        # 30 AI requests per minute
    "search": {"limit": 60, "window": 60},    # 60 searches per minute
}


def get_rate_limit_status(request: Request, endpoint: str = "api") -> Dict:
    """Get current rate limit status for a request"""
    config = RATE_LIMITS.get(endpoint, RATE_LIMITS["api"])
    _, info = rate_limiter.check_rate_limit(
        request,
        limit=config["limit"],
        window_seconds=config["window"],
        endpoint=endpoint
    )
    return info
