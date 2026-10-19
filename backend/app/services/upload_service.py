from dataclasses import dataclass
from email.parser import BytesParser
from email.policy import default
from pathlib import Path
import logging
import re
import unicodedata

from fastapi import HTTPException, Request, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UploadedFilePayload:
    filename: str
    content_type: str
    data: bytes


def storage_root() -> Path:
    settings = get_settings()
    root = Path(settings.STORAGE_DIR)
    if not root.is_absolute():
        root = Path(__file__).resolve().parents[2] / root
    root = root.resolve()
    root.mkdir(parents=True, exist_ok=True)

    if not settings.is_development:
        mount_points = [candidate for candidate in (root, *root.parents) if candidate.is_mount()]
        if not mount_points or mount_points[0] == Path(root.anchor):
            logger.warning(
                "STORAGE_DIR=%s is on an ephemeral filesystem; uploaded files may be lost on restart. "
                "Attach persistent storage at this path or configure external object storage.",
                root,
            )
    return root


def safe_filename(filename: str) -> str:
    normalized = unicodedata.normalize("NFKD", filename).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", normalized).strip(".-")
    return normalized[:180] or "upload"


async def read_multipart_file(
    request: Request,
    *,
    field_name: str,
    max_bytes: int,
) -> UploadedFilePayload:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type.lower():
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Expected multipart form upload",
        )

    content_length = request.headers.get("content-length")
    try:
        declared_length = int(content_length) if content_length else 0
    except ValueError:
        declared_length = 0

    if declared_length > max_bytes + 8192:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large. Maximum size is {max_bytes // (1024 * 1024)} MB.",
        )

    # Stream into a bounded buffer so a missing or dishonest Content-Length
    # cannot force an unbounded request.body() allocation.
    body_parts: list[bytes] = []
    body_size = 0
    max_body_bytes = max_bytes + 65536
    async for chunk in request.stream():
        body_size += len(chunk)
        if body_size > max_body_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File is too large. Maximum size is {max_bytes // (1024 * 1024)} MB.",
            )
        body_parts.append(chunk)
    body = b"".join(body_parts)

    message = BytesParser(policy=default).parsebytes(
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8") + body
    )

    if not message.is_multipart():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid multipart payload")

    for part in message.iter_parts():
        params = dict(part.get_params(header="content-disposition", unquote=True) or [])
        if params.get("name") != field_name:
            continue

        filename = part.get_filename() or "upload"
        data = part.get_payload(decode=True) or b""
        if len(data) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File is too large. Maximum size is {max_bytes // (1024 * 1024)} MB.",
            )

        return UploadedFilePayload(
            filename=safe_filename(filename),
            content_type=part.get_content_type() or "application/octet-stream",
            data=data,
        )

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing upload file")
