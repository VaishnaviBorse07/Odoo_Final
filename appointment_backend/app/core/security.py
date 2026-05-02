# Password hashing and JWT helpers — exports hash_password, verify_password, create_token, decode_token.
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import Settings

PWD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$")


def password_ok(p: str) -> bool:
    return bool(PWD_REGEX.match(p or ""))


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=10)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _parse_expiry(spec: str) -> timedelta:
    spec = (spec or "7d").strip().lower()
    if spec.endswith("d"):
        return timedelta(days=int(spec[:-1] or "7"))
    if spec.endswith("h"):
        return timedelta(hours=int(spec[:-1] or "24"))
    if spec.endswith("m"):
        return timedelta(minutes=int(spec[:-1] or "60"))
    return timedelta(days=7)


def create_token(settings: Settings, user_id: int, email: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + _parse_expiry(settings.jwt_expires_in)
    payload = {"sub": str(user_id), "email": email, "role": role, "exp": int(exp.timestamp())}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(settings: Settings, token: str) -> Optional[dict[str, Any]]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        return None
