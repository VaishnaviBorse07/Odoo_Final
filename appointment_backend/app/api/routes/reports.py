# Organiser/admin analytics — exports router.
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_roles
from app.core.responses import err_json, ok_json
from app.core.serialize import record_to_dict, records_to_dicts
from app.db import pool

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/overview")
async def overview(
    appointmentTypeId: Optional[int] = Query(None),
    user: dict = Depends(require_roles("organiser", "admin")),
):
    async with pool().acquire() as conn:
        if user["role"] == "admin":
            if appointmentTypeId:
                filt = "appointment_type_id = $1"
                args: list = [appointmentTypeId]
            else:
                filt = "TRUE"
                args = []
        else:
            if appointmentTypeId:
                own = await conn.fetchval(
                    "SELECT 1 FROM appointment_types WHERE id = $1 AND organiser_id = $2",
                    appointmentTypeId,
                    user["id"],
                )
                if not own:
                    return err_json("Forbidden", 403)
                filt = "appointment_type_id = $1"
                args = [appointmentTypeId]
            else:
                filt = "appointment_type_id IN (SELECT id FROM appointment_types WHERE organiser_id = $1)"
                args = [user["id"]]
        q = f"""
            SELECT
              COUNT(*)::int AS total_bookings,
              COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_bookings,
              COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_bookings,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_bookings,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_sessions
            FROM bookings WHERE {filt}
        """
        row = await conn.fetchrow(q, *args)
    return ok_json(record_to_dict(row))


@router.get("/peak-hours")
async def peak_hours(user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        if user["role"] == "admin":
            rows = await conn.fetch(
                """
                SELECT start_time, COUNT(*)::int AS booking_count
                FROM bookings
                GROUP BY start_time
                ORDER BY booking_count DESC
                LIMIT 5
                """
            )
        else:
            rows = await conn.fetch(
                """
                SELECT b.start_time, COUNT(*)::int AS booking_count
                FROM bookings b
                JOIN appointment_types at ON at.id = b.appointment_type_id
                WHERE at.organiser_id = $1
                GROUP BY b.start_time
                ORDER BY booking_count DESC
                LIMIT 5
                """,
                user["id"],
            )
    return ok_json(records_to_dicts(list(rows)))


@router.get("/provider-utilization")
async def provider_utilization(user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        if user["role"] == "admin":
            rows = await conn.fetch(
                """
                SELECT r.resource_name,
                  COUNT(b.id) FILTER (WHERE b.status <> 'cancelled')::int AS total_sessions_booked,
                  COUNT(b.id) FILTER (WHERE b.status = 'confirmed')::int AS total_confirmed,
                  COUNT(b.id) FILTER (WHERE b.status = 'cancelled')::int AS total_cancelled,
                  COUNT(b.id) FILTER (WHERE b.status = 'pending')::int AS total_pending
                FROM resources r
                LEFT JOIN bookings b ON b.resource_id = r.id
                GROUP BY r.id, r.resource_name
                ORDER BY r.resource_name
                """
            )
        else:
            rows = await conn.fetch(
                """
                SELECT r.resource_name,
                  COUNT(b.id) FILTER (WHERE b.status <> 'cancelled')::int AS total_sessions_booked,
                  COUNT(b.id) FILTER (WHERE b.status = 'confirmed')::int AS total_confirmed,
                  COUNT(b.id) FILTER (WHERE b.status = 'cancelled')::int AS total_cancelled,
                  COUNT(b.id) FILTER (WHERE b.status = 'pending')::int AS total_pending
                FROM resources r
                JOIN appointment_types at ON at.id = r.appointment_type_id
                LEFT JOIN bookings b ON b.resource_id = r.id
                WHERE at.organiser_id = $1
                GROUP BY r.id, r.resource_name
                ORDER BY r.resource_name
                """,
                user["id"],
            )
    return ok_json(records_to_dicts(list(rows)))
