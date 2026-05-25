from typing import Any
from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, status_code: int, detail: str, code: str) -> None:
        self.status_code = status_code
        self.detail = detail
        self.code = code


async def app_exception_handler(
    request: Request,
    exc: AppException,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code},
    )


async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    if exc.status_code == 401:
        code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 429:
        code = "RATE_LIMIT"
    else:
        code = "ERROR"

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": code},
    )



def _sanitize_error_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {k: _sanitize_error_item(v) for k, v in item.items()}
    elif isinstance(item, list):
        return [_sanitize_error_item(i) for i in item]
    elif isinstance(item, tuple):
        return tuple(_sanitize_error_item(i) for i in item)
    elif isinstance(item, Exception):
        return str(item)
    else:
        # Try to JSON serialize it, if it fails, convert to string
        import json
        try:
            json.dumps(item)
            return item
        except Exception:
            return str(item)

async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    sanitized_details = _sanitize_error_item(exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": sanitized_details, "code": "VALIDATION_ERROR"},
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
    )
