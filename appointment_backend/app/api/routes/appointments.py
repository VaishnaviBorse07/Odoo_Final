# Appointment types CRUD, questions, publish — exports router.
import secrets
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_token_user, optional_user, require_roles
from app.core.responses import err_json, ok_json
from app.core.serialize import record_to_dict, records_to_dicts
from app.db import pool

router = APIRouter(prefix="/appointments", tags=["appointments"])


async def _detail(conn, apt_id: int) -> Optional[dict[str, Any]]:
    at = await conn.fetchrow("SELECT * FROM appointment_types WHERE id = $1", apt_id)
    if not at:
        return None
    base = record_to_dict(at)
    res_rows = await conn.fetch(
        "SELECT * FROM resources WHERE appointment_type_id = $1 ORDER BY id",
        apt_id,
    )
    resources = []
    for r in res_rows:
        rd = record_to_dict(r)
        wh = await conn.fetch(
            "SELECT * FROM working_hours WHERE resource_id = $1 ORDER BY day_of_week, start_time",
            r["id"],
        )
        fs = await conn.fetch(
            "SELECT * FROM flexible_slots WHERE resource_id = $1 ORDER BY slot_date, start_time",
            r["id"],
        )
        rd["working_hours"] = records_to_dicts(list(wh))
        rd["flexible_slots"] = records_to_dicts(list(fs))
        resources.append(rd)
    qs = await conn.fetch(
        """
        SELECT * FROM appointment_questions
        WHERE appointment_type_id = $1 ORDER BY display_order, id
        """,
        apt_id,
    )
    base["resources"] = resources
    base["questions"] = records_to_dicts(list(qs))
    return base


async def _can_edit_appointment(conn, user: dict, apt_id: int):
    at = await conn.fetchrow("SELECT organiser_id FROM appointment_types WHERE id = $1", apt_id)
    if not at:
        return False, None
    if user["role"] == "admin":
        return True, at
    if user["role"] == "organiser" and at["organiser_id"] == user["id"]:
        return True, at
    return False, at


@router.get("")
async def list_published(search: Optional[str] = None):
    async with pool().acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT vas.*, r.id AS res_id, r.resource_name
            FROM v_appointment_summary vas
            LEFT JOIN resources r ON r.appointment_type_id = vas.id AND r.is_active = TRUE
            WHERE vas.status = 'published'
              AND ($1::text IS NULL OR vas.name ILIKE '%' || $1 || '%')
            ORDER BY vas.name, r.id
            """,
            search.strip() if search else None,
        )
    by_id: dict[int, dict] = {}
    for row in rows:
        aid = row["id"]
        if aid not in by_id:
            by_id[aid] = {
                "id": row["id"],
                "name": row["name"],
                "description": None,
                "status": row["status"],
                "slot_type": row["slot_type"],
                "duration_minutes": row["duration_minutes"],
                "location": row["location"],
                "advance_payment": row["advance_payment"],
                "payment_amount": float(row["payment_amount"]) if row["payment_amount"] is not None else 0,
                "share_token": row["share_token"],
                "manage_capacity": row["manage_capacity"],
                "max_capacity": row["max_capacity"],
                "confirmation_type": row["confirmation_type"],
                "assignment_type": row["assignment_type"],
                "organiser_id": row["organiser_id"],
                "organiser_name": row["organiser_name"],
                "resource_count": row["resource_count"],
                "upcoming_count": row["total_upcoming_bookings"],
                "resources": [],
            }
        if row["res_id"]:
            by_id[aid]["resources"].append({"id": row["res_id"], "resource_name": row["resource_name"]})
    # descriptions
    if not by_id:
        return ok_json({"appointments": []})
    async with pool().acquire() as conn:
        descs = await conn.fetch("SELECT id, description FROM appointment_types WHERE id = ANY($1::int[])", list(by_id.keys()))
    for d in descs:
        if d["id"] in by_id:
            by_id[d["id"]]["description"] = d["description"]
    return ok_json({"appointments": list(by_id.values())})


@router.get("/share/{token}")
async def by_share_token(token: str):
    async with pool().acquire() as conn:
        at = await conn.fetchrow(
            "SELECT id FROM appointment_types WHERE share_token = $1",
            token,
        )
        if not at:
            return err_json("Not found", 404)
        data = await _detail(conn, at["id"])
    return ok_json(data)


@router.get("/mine")
async def mine(user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        if user["role"] == "admin":
            rows = await conn.fetch(
                """
                SELECT vas.*, r.id AS res_id, r.resource_name
                FROM v_appointment_summary vas
                LEFT JOIN resources r ON r.appointment_type_id = vas.id AND r.is_active = TRUE
                ORDER BY vas.organiser_id, vas.name, r.id
                """
            )
        else:
            rows = await conn.fetch(
                """
                SELECT vas.*, r.id AS res_id, r.resource_name
                FROM v_appointment_summary vas
                LEFT JOIN resources r ON r.appointment_type_id = vas.id AND r.is_active = TRUE
                WHERE vas.organiser_id = $1
                ORDER BY vas.name, r.id
                """,
                user["id"],
            )
        qcounts = await conn.fetch(
            "SELECT appointment_type_id, COUNT(*)::int AS c FROM appointment_questions GROUP BY appointment_type_id"
        )
        qc_map = {r["appointment_type_id"]: r["c"] for r in qcounts}
    by_id: dict[int, dict] = {}
    for row in rows:
        aid = row["id"]
        if aid not in by_id:
            by_id[aid] = {
                "id": row["id"],
                "name": row["name"],
                "status": row["status"],
                "slot_type": row["slot_type"],
                "duration_minutes": row["duration_minutes"],
                "location": row["location"],
                "advance_payment": row["advance_payment"],
                "payment_amount": float(row["payment_amount"]) if row["payment_amount"] is not None else 0,
                "share_token": row["share_token"],
                "manage_capacity": row["manage_capacity"],
                "max_capacity": row["max_capacity"],
                "confirmation_type": row["confirmation_type"],
                "assignment_type": row["assignment_type"],
                "organiser_id": row["organiser_id"],
                "organiser_name": row["organiser_name"],
                "resource_count": row["resource_count"],
                "upcoming_count": row["total_upcoming_bookings"],
                "question_count": qc_map.get(aid, 0),
                "resources": [],
            }
        if row["res_id"]:
            by_id[aid]["resources"].append({"id": row["res_id"], "resource_name": row["resource_name"]})
    return ok_json({"appointments": list(by_id.values())})


@router.get("/{apt_id}")
async def one(apt_id: int, user: Optional[dict] = Depends(optional_user)):
    async with pool().acquire() as conn:
        at = await conn.fetchrow("SELECT * FROM appointment_types WHERE id = $1", apt_id)
        if not at:
            return err_json("Not found", 404)
        if at["status"] != "published":
            if not user:
                return err_json("Unauthorized", 401)
            if user["role"] != "admin" and user["id"] != at["organiser_id"]:
                return err_json("Forbidden", 403)
        data = await _detail(conn, apt_id)
    return ok_json(data)


class CreateAppointment(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int
    location: Optional[str] = None
    slot_type: str = "weekly"
    max_capacity: int = 1
    manage_capacity: bool = False
    # Customer must pay this INR amount (min ₹1) via Razorpay to confirm a booking.
    payment_amount: float = Field(..., ge=1)
    confirmation_type: str = "automatic"
    assignment_type: str = "auto"


@router.post("")
async def create(body: CreateAppointment, user: dict = Depends(require_roles("organiser", "admin"))):
    token = secrets.token_hex(16)
    async with pool().acquire() as conn:
        aid = await conn.fetchval(
            """
            INSERT INTO appointment_types (
              organiser_id, name, description, duration_minutes, location, status,
              slot_type, max_capacity, manage_capacity, advance_payment, payment_amount,
              confirmation_type, assignment_type, share_token
            ) VALUES ($1,$2,$3,$4,$5,'draft',$6::slot_type,$7,$8,TRUE,$9,$10::confirmation_type,$11::assignment_type,$12)
            RETURNING id
            """,
            user["id"],
            body.name.strip(),
            body.description,
            body.duration_minutes,
            body.location,
            body.slot_type,
            body.max_capacity,
            body.manage_capacity,
            body.payment_amount,
            body.confirmation_type,
            body.assignment_type,
            token,
        )
        data = await _detail(conn, aid)
    return ok_json(data, "Created", 201)


class UpdateAppointment(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    slot_type: Optional[str] = None
    max_capacity: Optional[int] = None
    manage_capacity: Optional[bool] = None
    payment_amount: Optional[float] = Field(default=None, ge=1)
    confirmation_type: Optional[str] = None
    assignment_type: Optional[str] = None
    hold_timeout_minutes: Optional[int] = Field(default=None, ge=2, le=60)


@router.put("/{apt_id}")
async def update(apt_id: int, body: UpdateAppointment, user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        ok, at = await _can_edit_appointment(conn, user, apt_id)
        if not at:
            return err_json("Not found", 404)
        if not ok:
            return err_json("Forbidden", 403)
        d = body.model_dump(exclude_unset=True)
        if not d:
            data = await _detail(conn, apt_id)
            return ok_json(data)
        fields = []
        vals: list[Any] = []
        i = 1
        mapping = [
            ("name", "text"),
            ("description", "text"),
            ("duration_minutes", "int"),
            ("location", "text"),
            ("slot_type", "slot_type"),
            ("max_capacity", "int"),
            ("manage_capacity", "bool"),
            ("payment_amount", "numeric"),
            ("confirmation_type", "confirmation_type"),
            ("assignment_type", "assignment_type"),
            ("hold_timeout_minutes", "int"),
        ]
        for key, cast in mapping:
            if key not in d:
                continue
            fields.append(f"{key} = ${i}::{cast}")
            vals.append(d[key])
            i += 1
        if "payment_amount" in d:
            fields.append(f"advance_payment = ${i}::bool")
            vals.append(True)
            i += 1
        vals.append(apt_id)
        await conn.execute(
            f"UPDATE appointment_types SET {', '.join(fields)} WHERE id = ${i}",
            *vals,
        )
        data = await _detail(conn, apt_id)
    return ok_json(data)


class StatusBody(BaseModel):
    status: str


@router.patch("/{apt_id}/status")
async def patch_status(apt_id: int, body: StatusBody, user: dict = Depends(require_roles("organiser", "admin"))):
    if body.status not in ("published", "unpublished", "draft"):
        return err_json("Invalid status", 400)
    async with pool().acquire() as conn:
        ok, at = await _can_edit_appointment(conn, user, apt_id)
        if not at:
            return err_json("Not found", 404)
        if not ok:
            return err_json("Forbidden", 403)
        if body.status == "published":
            chk = await conn.fetchrow(
                "SELECT advance_payment, payment_amount FROM appointment_types WHERE id = $1",
                apt_id,
            )
            if not chk or not chk["advance_payment"] or float(chk["payment_amount"] or 0) < 1:
                return err_json(
                    "Set a customer booking fee of at least ₹1 before publishing (fee is required for all classes).",
                    400,
                )
        await conn.execute(
            "UPDATE appointment_types SET status = $1::appointment_status WHERE id = $2",
            body.status,
            apt_id,
        )
        data = await _detail(conn, apt_id)
    return ok_json(data)


@router.delete("/{apt_id}")
async def delete_apt(apt_id: int, user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        ok, at = await _can_edit_appointment(conn, user, apt_id)
        if not at:
            return err_json("Not found", 404)
        if not ok:
            return err_json("Forbidden", 403)
        n = await conn.fetchval(
            """
            SELECT COUNT(*) FROM bookings
            WHERE appointment_type_id = $1 AND booking_date >= CURRENT_DATE
              AND status IN ('confirmed','pending')
            """,
            apt_id,
        )
        if n and int(n) > 0:
            return err_json("Cannot delete appointment with active bookings", 409)
        await conn.execute("DELETE FROM appointment_types WHERE id = $1", apt_id)
    return ok_json(None, "Deleted")


class QuestionBody(BaseModel):
    question_text: str
    is_required: bool = True
    display_order: int = 0


@router.post("/{apt_id}/questions")
async def add_question(apt_id: int, body: QuestionBody, user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        ok, at = await _can_edit_appointment(conn, user, apt_id)
        if not at:
            return err_json("Not found", 404)
        if not ok:
            return err_json("Forbidden", 403)
        qid = await conn.fetchval(
            """
            INSERT INTO appointment_questions (appointment_type_id, question_text, is_required, display_order)
            VALUES ($1,$2,$3,$4) RETURNING id
            """,
            apt_id,
            body.question_text.strip(),
            body.is_required,
            body.display_order,
        )
        row = await conn.fetchrow("SELECT * FROM appointment_questions WHERE id = $1", qid)
    return ok_json(record_to_dict(row), "Created", 201)


@router.delete("/{apt_id}/questions/{qid}")
async def del_question(
    apt_id: int, qid: int, user: dict = Depends(require_roles("organiser", "admin"))
):
    async with pool().acquire() as conn:
        ok, at = await _can_edit_appointment(conn, user, apt_id)
        if not at:
            return err_json("Not found", 404)
        if not ok:
            return err_json("Forbidden", 403)
        await conn.execute(
            "DELETE FROM appointment_questions WHERE id = $1 AND appointment_type_id = $2",
            qid,
            apt_id,
        )
    return ok_json(None, "Deleted")
