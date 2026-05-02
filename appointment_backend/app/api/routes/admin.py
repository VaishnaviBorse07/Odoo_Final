# Admin-only user listing and system stats — exports router.
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import require_roles
from app.core.responses import err_json, ok_json
from app.core.serialize import record_to_dict, records_to_dicts
from app.db import pool

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_roles("admin")),
):
    off = (page - 1) * limit
    where = ["1=1"]
    args: list = []
    n = 1
    if role:
        where.append(f"role = ${n}::user_role")
        args.append(role)
        n += 1
    if status:
        where.append(f"status = ${n}::user_status")
        args.append(status)
        n += 1
    if search:
        where.append(f"(full_name ILIKE ${n} OR email ILIKE ${n})")
        args.append(f"%{search}%")
        n += 1
    wc = " AND ".join(where)
    async with pool().acquire() as conn:
        total = await conn.fetchval(f"SELECT COUNT(*) FROM users WHERE {wc}", *args)
        rows = await conn.fetch(
            f"""
            SELECT id, full_name, email, role, status, profile_picture, phone, created_at
            FROM users WHERE {wc}
            ORDER BY id ASC LIMIT ${n} OFFSET ${n + 1}
            """,
            *args,
            limit,
            off,
        )
    return ok_json({"users": records_to_dicts(list(rows)), "total": int(total or 0), "page": page, "limit": limit})


class StatusPatch(BaseModel):
    status: str


@router.patch("/users/{uid}/status")
async def patch_user_status(uid: int, body: StatusPatch, user: dict = Depends(require_roles("admin"))):
    if body.status not in ("active", "inactive"):
        return err_json("Invalid status", 400)
    if uid == user["id"]:
        return err_json("Cannot deactivate yourself", 400)
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE users SET status = $1::user_status WHERE id = $2
            RETURNING id, full_name, email, role, status, profile_picture, phone, created_at
            """,
            body.status,
            uid,
        )
    if not row:
        return err_json("Not found", 404)
    return ok_json(record_to_dict(row))


class RolePatch(BaseModel):
    role: str


@router.patch("/users/{uid}/role")
async def patch_user_role(uid: int, body: RolePatch, user: dict = Depends(require_roles("admin"))):
    if body.role not in ("customer", "organiser", "admin"):
        return err_json("Invalid role", 400)
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE users SET role = $1::user_role WHERE id = $2
            RETURNING id, full_name, email, role, status, profile_picture, phone, created_at
            """,
            body.role,
            uid,
        )
    if not row:
        return err_json("Not found", 404)
    return ok_json(record_to_dict(row))


@router.get("/stats")
async def stats(user: dict = Depends(require_roles("admin"))):
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
              COUNT(*)::int AS total_users,
              COUNT(*) FILTER (WHERE role = 'customer')::int AS total_customers,
              COUNT(*) FILTER (WHERE role = 'organiser')::int AS total_organisers,
              COUNT(*) FILTER (WHERE role = 'admin')::int AS total_admins,
              (SELECT COUNT(*)::int FROM appointment_types) AS total_appointment_types,
              (SELECT COUNT(*)::int FROM appointment_types WHERE status = 'published') AS total_published_appointments,
              (SELECT COUNT(*)::int FROM bookings) AS total_bookings,
              (SELECT COUNT(*)::int FROM bookings WHERE status = 'confirmed') AS total_confirmed_bookings,
              (SELECT COUNT(*)::int FROM bookings WHERE booking_date = CURRENT_DATE) AS total_bookings_today
            FROM users
            """
        )
    return ok_json(record_to_dict(row))
