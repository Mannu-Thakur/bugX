from fastapi import HTTPException, status
from pathlib import Path
import uuid

from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.user import User
from app.models.user_file import UserFile
from app.repositories.user_repo import UserRepo
from app.schemas.user import UserFileResponse, UserUpdate
from app.services.upload_service import UploadedFilePayload, safe_filename, storage_root


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepo(db)

    async def update_me(self, current_user: User, req: UserUpdate) -> User:
        fields_set = req.model_fields_set

        if req.username is not None and req.username != current_user.username:
            existing = await self.user_repo.get_by_username(req.username)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="USERNAME_TAKEN"
                )
            current_user.username = req.username

        if "avatar_url" in fields_set and req.avatar_url != current_user.avatar_url:
            current_user.avatar_url = req.avatar_url

        for field in ("leetcode_url", "github_url", "linkedin_url", "portfolio_url"):
            if field in fields_set and getattr(req, field) != getattr(current_user, field):
                setattr(current_user, field, getattr(req, field))

        self.db.add(current_user)
        await self.db.commit()
        await self.db.refresh(current_user)

        return current_user

    async def save_avatar(self, current_user: User, upload: UploadedFilePayload) -> User:
        settings = get_settings()
        if not upload.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Avatar must be an image file",
            )

        if len(upload.data) > settings.MAX_AVATAR_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Avatar is too large. Maximum size is {settings.MAX_AVATAR_BYTES // (1024 * 1024)} MB.",
            )

        suffix = Path(upload.filename).suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            suffix = _extension_for_content_type(upload.content_type)

        public_dir = storage_root() / "public" / "avatars"
        public_dir.mkdir(parents=True, exist_ok=True)

        stored_name = f"{current_user.id}{suffix}"
        stored_path = public_dir / stored_name
        stored_path.write_bytes(upload.data)

        current_user.avatar_url = f"/uploads/avatars/{stored_name}"
        self.db.add(current_user)
        await self.db.commit()
        await self.db.refresh(current_user)
        return current_user

    async def list_files(self, current_user: User, subject: str | None = None) -> list[UserFileResponse]:
        stmt = select(UserFile).where(UserFile.user_id == current_user.id)
        if subject:
            stmt = stmt.where(UserFile.subject == subject)
        stmt = stmt.order_by(UserFile.created_at.desc())
        rows = list((await self.db.execute(stmt)).scalars().all())
        return [_file_response(row) for row in rows]

    async def save_file(self, current_user: User, subject: str, upload: UploadedFilePayload) -> UserFileResponse:
        _validate_subject(subject)

        settings = get_settings()
        if len(upload.data) > settings.MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File is too large. Maximum size is {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )

        file_id = uuid.uuid4()
        filename = safe_filename(upload.filename)
        relative_path = Path("private") / "user_files" / str(current_user.id) / f"{file_id}-{filename}"
        target_path = storage_root() / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(upload.data)

        record = UserFile(
            id=file_id,
            user_id=current_user.id,
            subject=subject,
            original_name=filename,
            stored_path=relative_path.as_posix(),
            content_type=upload.content_type or "application/octet-stream",
            size_bytes=len(upload.data),
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return _file_response(record)

    async def delete_file(self, current_user: User, file_id: uuid.UUID) -> None:
        record = await self._get_owned_file(current_user, file_id)
        path = _resolve_stored_path(record.stored_path)
        if path.exists():
            path.unlink()
        await self.db.delete(record)
        await self.db.commit()

    async def download_file(self, current_user: User, file_id: uuid.UUID) -> FileResponse:
        record = await self._get_owned_file(current_user, file_id)
        path = _resolve_stored_path(record.stored_path)
        if not path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

        return FileResponse(
            path,
            media_type=record.content_type,
            filename=record.original_name,
        )

    async def _get_owned_file(self, current_user: User, file_id: uuid.UUID) -> UserFile:
        stmt = select(UserFile).where(
            UserFile.id == file_id,
            UserFile.user_id == current_user.id,
        )
        record = (await self.db.execute(stmt)).scalars().first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        return record


def _extension_for_content_type(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(content_type.lower(), ".png")


def _validate_subject(subject: str) -> None:
    if subject not in {"dbms", "sql", "os", "cn", "oop", "dsa"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid subject")


def _file_response(record: UserFile) -> UserFileResponse:
    return UserFileResponse(
        id=record.id,
        subject=record.subject,
        name=record.original_name,
        type=record.content_type,
        size=record.size_bytes,
        uploaded_at=record.created_at,
    )


def _resolve_stored_path(stored_path: str) -> Path:
    root = storage_root().resolve()
    path = (root / stored_path).resolve()
    if root != path and root not in path.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid stored path")
    return path
