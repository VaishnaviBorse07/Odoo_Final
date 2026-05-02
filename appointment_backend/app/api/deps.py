# FastAPI dependencies — JWT user extraction and role guards; exports get_settings_dep, get_token_user, require_roles, optional_user.
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.security import decode_token

_bearer_optional = HTTPBearer(auto_error=False)


async def get_settings_dep() -> Settings:
    return get_settings()


async def get_token_user(
    creds: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    settings: Settings = Depends(get_settings_dep),
) -> dict:
    token = creds.credentials.strip()
    payload = decode_token(settings, token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        uid = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"id": uid, "email": payload.get("email"), "role": payload.get("role")}


def require_roles(*roles: str):
    async def _inner(user: dict = Depends(get_token_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return _inner


async def optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_optional),
    settings: Settings = Depends(get_settings_dep),
) -> Optional[dict]:
    if not creds:
        return None
    payload = decode_token(settings, creds.credentials.strip())
    if not payload:
        return None
    try:
        uid = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        return None
    return {"id": uid, "email": payload.get("email"), "role": payload.get("role")}
