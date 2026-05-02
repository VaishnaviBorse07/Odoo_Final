# Resource CRUD, working hours replace-all, flexible slots — exports router.
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel

from app.api.deps import get_token_user, require_roles
from app.core.responses import err_json, ok_json
from app.core.serialize import record_to_dict, records_to_dicts
from app.db import pool
from app.services.slot_engine import time_str_to_minutes, times_overlap

router = APIRouter(prefix="/resources", tags=["resources"])


async def _owns_resource(conn, user: dict, resource_id: int) -> bool:
    row = await conn.fetchrow(
        """
        SELECT at.organiser_id FROM resources r
        JOIN appointment_types at ON at.id = r.appointment_type_id
        WHERE r.id = $1
        """,
        resource_id,
    )
    if not row:
        return False
    if user["role"] == "admin":
        return True
    return row["organiser_id"] == user["id"]


@router.get("/appointment/{appointment_type_id}")
async def by_appointment(appointment_type_id: int, user: dict = Depends(get_token_user)):
    async with pool().acquire() as conn:
        if user["role"] == "admin":
            rows = await conn.fetch(
                "SELECT * FROM resources WHERE appointment_type_id = $1 AND is_active = TRUE",
                appointment_type_id,
            )
        elif user["role"] == "organiser":
            rows = await conn.fetch(
                """
                SELECT r.* FROM resources r
                JOIN appointment_types at ON at.id = r.appointment_type_id
                WHERE r.appointment_type_id = $1 AND r.is_active = TRUE AND at.organiser_id = $2
                """,
                appointment_type_id,
                user["id"],
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM resources WHERE appointment_type_id = $1 AND is_active = TRUE",
                appointment_type_id,
            )
    return ok_json(records_to_dicts(list(rows)))


class CreateResource(BaseModel):
    appointment_type_id: int
    resource_name: str
    user_id: Optional[int] = None


@router.post("")
async def create_res(body: CreateResource, user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        at = await conn.fetchrow(
            "SELECT organiser_id FROM appointment_types WHERE id = $1",
            body.appointment_type_id,
        )
        if not at:
            return err_json("Appointment type not found", 404)
        if user["role"] != "admin" and at["organiser_id"] != user["id"]:
            return err_json("Forbidden", 403)
        rid = await conn.fetchval(
            """
            INSERT INTO resources (appointment_type_id, user_id, resource_name)
            VALUES ($1,$2,$3) RETURNING id
            """,
            body.appointment_type_id,
            body.user_id,
            body.resource_name.strip(),
        )
        row = await conn.fetchrow("SELECT * FROM resources WHERE id = $1", rid)
    return ok_json(record_to_dict(row), "Created", 201)


class UpdateResource(BaseModel):
    resource_name: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/{resource_id}")
async def update_res(resource_id: int, body: UpdateResource, user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        if not await _owns_resource(conn, user, resource_id):
            return err_json("Forbidden or not found", 403)
        d = body.model_dump(exclude_unset=True)
        if not d:
            row = await conn.fetchrow("SELECT * FROM resources WHERE id = $1", resource_id)
            return ok_json(record_to_dict(row))
        parts = []
        vals: list[Any] = []
        n = 1
        if "resource_name" in d:
            parts.append(f"resource_name = ${n}")
            vals.append(d["resource_name"])
            n += 1
        if "is_active" in d:
            parts.append(f"is_active = ${n}")
            vals.append(d["is_active"])
            n += 1
        vals.append(resource_id)
        await conn.execute(f"UPDATE resources SET {', '.join(parts)} WHERE id = ${n}", *vals)
        row = await conn.fetchrow("SELECT * FROM resources WHERE id = $1", resource_id)
    return ok_json(record_to_dict(row))


class WhItem(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    is_available: bool = True


@router.post("/{resource_id}/working-hours")
async def replace_wh(
    resource_id: int, body: list[WhItem] = Body(...), user: dict = Depends(require_roles("organiser", "admin"))
):
    async with pool().acquire() as conn:
        if not await _owns_resource(conn, user, resource_id):
            return err_json("Forbidden or not found", 403)
        await conn.execute("DELETE FROM working_hours WHERE resource_id = $1", resource_id)
        for item in body:
            await conn.execute(
                """
                INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
                VALUES ($1,$2,$3::time,$4::time,$5)
                """,
                resource_id,
                item.day_of_week,
                item.start_time,
                item.end_time,
                item.is_available,
            )
        rows = await conn.fetch(
            "SELECT * FROM working_hours WHERE resource_id = $1 ORDER BY day_of_week",
            resource_id,
        )
    return ok_json(records_to_dicts(list(rows)))


class FlexSlotBody(BaseModel):
    slot_date: str
    start_time: str
    end_time: str


@router.post("/{resource_id}/flexible-slots")
async def add_flex(resource_id: int, body: FlexSlotBody, user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        if not await _owns_resource(conn, user, resource_id):
            return err_json("Forbidden or not found", 403)
        existing = await conn.fetch(
            "SELECT start_time, end_time FROM flexible_slots WHERE resource_id = $1 AND slot_date = $2::date",
            resource_id,
            body.slot_date,
        )
        ns = time_str_to_minutes(body.start_time)
        ne = time_str_to_minutes(body.end_time)
        for ex in existing:
            if times_overlap(ns, ne, time_str_to_minutes(ex["start_time"]), time_str_to_minutes(ex["end_time"])):
                return err_json("Overlapping flexible slot on that date", 409)
        sid = await conn.fetchval(
            """
            INSERT INTO flexible_slots (resource_id, slot_date, start_time, end_time, is_available)
            VALUES ($1,$2::date,$3::time,$4::time,TRUE) RETURNING id
            """,
            resource_id,
            body.slot_date,
            body.start_time,
            body.end_time,
        )
        row = await conn.fetchrow("SELECT * FROM flexible_slots WHERE id = $1", sid)
    return ok_json(record_to_dict(row), "Created", 201)


@router.delete("/{resource_id}/flexible-slots/{slot_id}")
async def del_flex(
    resource_id: int, slot_id: int, user: dict = Depends(require_roles("organiser", "admin"))
):
    async with pool().acquire() as conn:
        if not await _owns_resource(conn, user, resource_id):
            return err_json("Forbidden or not found", 403)
        await conn.execute(
            "DELETE FROM flexible_slots WHERE id = $1 AND resource_id = $2",
            slot_id,
            resource_id,
        )
    return ok_json(None, "Deleted")
