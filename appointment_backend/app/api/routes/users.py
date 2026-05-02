# Authenticated user profile and password routes — exports router.
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_settings_dep, get_token_user
from app.core.config import Settings
from app.core.responses import err_json, ok_json
from app.core.security import hash_password, password_ok, verify_password
from app.core.serialize import record_to_dict
from app.db import pool

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile")
async def profile(user: dict = Depends(get_token_user)):
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, full_name, email, role, status, profile_picture, phone, created_at
            FROM users WHERE id = $1
            """,
            user["id"],
        )
    if not row:
        return err_json("User not found", 404)
    return ok_json(record_to_dict(row))


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_picture: Optional[str] = None


@router.put("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_token_user)):
    sets = []
    args = []
    n = 1
    if body.full_name is not None:
        sets.append(f"full_name = ${n}")
        args.append(body.full_name.strip())
        n += 1
    if body.phone is not None:
        sets.append(f"phone = ${n}")
        args.append(body.phone)
        n += 1
    if body.profile_picture is not None:
        sets.append(f"profile_picture = ${n}")
        args.append(body.profile_picture)
        n += 1
    if not sets:
        return await profile(user)
    args.append(user["id"])
    q = f"UPDATE users SET {', '.join(sets)} WHERE id = ${n} RETURNING id, full_name, email, role, status, profile_picture, phone, created_at"
    async with pool().acquire() as conn:
        row = await conn.fetchrow(q, *args)
    return ok_json(record_to_dict(row))


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


@router.put("/change-password")
async def change_password(body: ChangePasswordBody, user: dict = Depends(get_token_user)):
    if not password_ok(body.new_password):
        return err_json(
            "Password must be 8+ chars with uppercase, lowercase and special character",
            400,
        )
    async with pool().acquire() as conn:
        row = await conn.fetchrow("SELECT password_hash FROM users WHERE id = $1", user["id"])
        if not row or not verify_password(body.current_password, row["password_hash"]):
            return err_json("Current password is incorrect", 400)
        await conn.execute(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            hash_password(body.new_password),
            user["id"],
        )
    return ok_json(None, "Password updated")
