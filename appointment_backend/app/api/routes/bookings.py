# Booking creation, slots, customer/organiser flows — exports router.
import calendar
import json
import secrets
from datetime import date as date_type, time as time_type
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api.deps import get_settings_dep, get_token_user, require_roles
from app.core.config import Settings
from app.core.responses import err_json, ok_json
from app.core.serialize import record_to_dict, records_to_dicts
from app.db import pool
from app.services.booking_payment import apply_successful_payment
from app.services.slot_engine import generate_flexible_slots, generate_weekly_slots

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _parse_time(value: str) -> time_type:
    return time_type.fromisoformat(str(value)[:8])


@router.get("/slots")
async def slots(
    appointmentTypeId: int = Query(...),
    resourceId: int = Query(...),
    date: str = Query(...),
    user: dict = Depends(get_token_user),
):
    d = date_type.fromisoformat(date[:10])
    async with pool().acquire() as conn:
        apt = await conn.fetchrow(
            "SELECT id, slot_type, duration_minutes FROM appointment_types WHERE id = $1",
            appointmentTypeId,
        )
        if not apt:
            return err_json("Appointment not found", 404)
        if apt["slot_type"] == "weekly":
            arr = await generate_weekly_slots(conn, resourceId, d, apt["duration_minutes"], appointmentTypeId)
        else:
            arr = await generate_flexible_slots(conn, resourceId, d, appointmentTypeId)
    return ok_json({"slots": arr})


@router.get("/slot-calendar")
async def slot_calendar(
    appointmentTypeId: int = Query(...),
    resourceId: int = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    user: dict = Depends(get_token_user),
):
    """Per-day count of bookable slots for the month (same rules as GET /slots)."""
    today = date_type.today()
    _, last = calendar.monthrange(year, month)
    counts: dict[str, int] = {}
    async with pool().acquire() as conn:
        apt = await conn.fetchrow(
            "SELECT id, slot_type, duration_minutes FROM appointment_types WHERE id = $1",
            appointmentTypeId,
        )
        if not apt:
            return err_json("Appointment not found", 404)
        for day in range(1, last + 1):
            d = date_type(year, month, day)
            key = d.isoformat()
            if d < today:
                counts[key] = 0
                continue
            if apt["slot_type"] == "weekly":
                arr = await generate_weekly_slots(
                    conn, resourceId, d, apt["duration_minutes"], appointmentTypeId
                )
            else:
                arr = await generate_flexible_slots(conn, resourceId, d, appointmentTypeId)
            counts[key] = sum(1 for s in arr if s.get("available"))
    return ok_json({"counts": counts})


class AnswerItem(BaseModel):
    question_id: int
    answer_text: str = ""


class CreateBooking(BaseModel):
    appointment_type_id: int
    resource_id: int
    booking_date: str
    start_time: str
    end_time: str
    capacity_booked: int = 1
    answers: list[AnswerItem] = Field(default_factory=list)


@router.post("")
async def create_booking(body: CreateBooking, user: dict = Depends(require_roles("customer"))):
    cap = max(1, int(body.capacity_booked or 1))
    bd = date_type.fromisoformat(body.booking_date[:10])
    st = _parse_time(body.start_time)
    et = _parse_time(body.end_time)
    if et <= st:
        return err_json("Invalid booking time range", 400)
    async with pool().acquire() as conn:
        async with conn.transaction():
            apt = await conn.fetchrow(
                """
                SELECT id, confirmation_type, advance_payment, payment_amount,
                       manage_capacity, max_capacity
                FROM appointment_types WHERE id = $1
                """,
                body.appointment_type_id,
            )
            if not apt:
                return err_json("Invalid appointment", 400)
            req_q = await conn.fetch(
                "SELECT id FROM appointment_questions WHERE appointment_type_id = $1 AND is_required = TRUE",
                body.appointment_type_id,
            )
            req_ids = {r["id"] for r in req_q}
            ans_map = {a.question_id: (a.answer_text or "").strip() for a in body.answers}
            if not req_ids.issubset(ans_map.keys()) or any(not ans_map[qid] for qid in req_ids):
                return err_json("Please answer all required questions", 400)
            if apt["manage_capacity"]:
                if cap < 1 or cap > (apt["max_capacity"] or 1):
                    return err_json("Invalid capacity", 400)
                booked_sum = await conn.fetchval(
                    """
                    SELECT COALESCE(SUM(capacity_booked),0) FROM bookings
                    WHERE resource_id = $1 AND booking_date = $2 AND status <> 'cancelled'
                      AND start_time < $3::time AND end_time > $4::time
                    """,
                    body.resource_id,
                    bd,
                    et,
                    st,
                )
                if int(booked_sum) + cap > (apt["max_capacity"] or 1):
                    return err_json("Not enough spots available for the requested capacity", 409)
            ok_slot = await conn.fetchval(
                """
                SELECT is_slot_available($1::int, $2::date, $3::time, $4::time, NULL::int,
                  $5::int, $6::int)
                """,
                body.resource_id,
                bd,
                st,
                et,
                body.appointment_type_id,
                cap,
            )
            if not ok_slot:
                return err_json("This slot is no longer available. Please choose another slot.", 409)
            if apt["advance_payment"]:
                pay_stat = "pending"
                pay_amt = float(apt["payment_amount"] or 0)
                # Payment is mandatory before confirmation — stay pending until Razorpay succeeds.
                status = "pending"
            else:
                pay_stat = "not_required"
                pay_amt = 0.0
                status = "confirmed" if apt["confirmation_type"] == "automatic" else "pending"
            bid = await conn.fetchval(
                """
                INSERT INTO bookings (
                  appointment_type_id, resource_id, customer_id, booking_date,
                  start_time, end_time, status, capacity_booked, payment_status, payment_amount
                ) VALUES ($1,$2,$3,$4::date,$5::time,$6::time,$7::booking_status,$8,$9,$10)
                RETURNING id
                """,
                body.appointment_type_id,
                body.resource_id,
                user["id"],
                bd,
                st,
                et,
                status,
                cap,
                pay_stat,
                pay_amt,
            )
            for a in body.answers:
                await conn.execute(
                    """
                    INSERT INTO booking_answers (booking_id, question_id, answer_text)
                    VALUES ($1,$2,$3)
                    """,
                    bid,
                    a.question_id,
                    a.answer_text or "",
                )
            detail = await conn.fetchrow(
                "SELECT * FROM v_booking_details WHERE booking_id = $1",
                bid,
            )
        if detail:
            payload = record_to_dict(detail)
        else:
            row_fallback = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", bid)
            payload = record_to_dict(row_fallback) if row_fallback else {}
        payload["id"] = bid
    return ok_json(payload, "Booked", 201)


def _razorpay_client(settings: Settings):
    if not (settings.razorpay_key_id and settings.razorpay_key_secret):
        return None
    import razorpay

    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


@router.post("/{booking_id}/razorpay-order")
async def razorpay_order(
    booking_id: int,
    user: dict = Depends(require_roles("customer")),
    settings: Settings = Depends(get_settings_dep),
):
    client = _razorpay_client(settings)
    if not client:
        return err_json(
            "Razorpay is not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server)",
            503,
        )
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, customer_id, payment_status, payment_amount, appointment_type_id
            FROM bookings WHERE id = $1
            """,
            booking_id,
        )
        if not row or row["customer_id"] != user["id"]:
            return err_json("Not found", 404)
        if row["payment_status"] != "pending":
            return err_json("No payment pending for this booking", 400)
        paise = int(round(float(row["payment_amount"] or 0) * 100))
        if paise < 100:
            return err_json("Booking fee must be at least ₹1 for online payment", 400)
        receipt = f"zf{booking_id}_{secrets.token_hex(3)}"[:40]
        try:
            order = client.order.create(
                {
                    "amount": paise,
                    "currency": "INR",
                    "receipt": receipt,
                    "notes": {
                        "booking_id": str(booking_id),
                        "appointment_type_id": str(row["appointment_type_id"]),
                    },
                }
            )
        except Exception as exc:
            return err_json(f"Could not create Razorpay order: {exc}", 502)
        await conn.execute("DELETE FROM payments WHERE booking_id = $1 AND status = 'CREATED'", booking_id)
        await conn.execute(
            """
            INSERT INTO payments (booking_id, order_id, amount, currency, status, customer_id, raw_response)
            VALUES ($1, $2, $3, 'INR', 'CREATED', $4, $5::jsonb)
            """,
            booking_id,
            order["id"],
            Decimal(str(row["payment_amount"] or 0)),
            user["id"],
            json.dumps(order),
        )
    return ok_json(
        {
            "key_id": settings.razorpay_key_id,
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
        }
    )


class RazorpayVerifyBody(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/{booking_id}/razorpay-verify")
async def razorpay_verify(
    booking_id: int,
    body: RazorpayVerifyBody,
    user: dict = Depends(require_roles("customer")),
    settings: Settings = Depends(get_settings_dep),
):
    client = _razorpay_client(settings)
    if not client:
        return err_json("Razorpay is not configured", 503)
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": body.razorpay_order_id,
                "razorpay_payment_id": body.razorpay_payment_id,
                "razorpay_signature": body.razorpay_signature,
            }
        )
    except Exception:
        return err_json("Invalid or expired payment confirmation", 400)
    try:
        pay_entity = client.payment.fetch(body.razorpay_payment_id)
    except Exception:
        return err_json("Could not load payment from Razorpay", 502)
    if str(pay_entity.get("order_id") or "") != body.razorpay_order_id:
        return err_json("Payment does not match order", 400)
    amount_paise = int(pay_entity.get("amount") or 0)
    raw_verify = {
        "source": "api_verify",
        "payment": pay_entity,
        "order_id": body.razorpay_order_id,
    }
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, customer_id, payment_status FROM bookings WHERE id = $1",
            booking_id,
        )
        if not row or row["customer_id"] != user["id"]:
            return err_json("Not found", 404)
        async with conn.transaction():
            out_dict = await apply_successful_payment(
                conn,
                booking_id=booking_id,
                razorpay_order_id=body.razorpay_order_id,
                razorpay_payment_id=body.razorpay_payment_id,
                amount_paise_from_gateway=amount_paise,
                raw_payload=raw_verify,
            )
        if out_dict is None:
            return err_json("Payment could not be applied to this booking (amount or order mismatch)", 400)
    return ok_json(record_to_dict(out_dict))


@router.get("/my")
async def my_bookings(user: dict = Depends(require_roles("customer"))):
    async with pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM v_booking_details WHERE customer_id = $1",
            user["id"],
        )
    upcoming = []
    past = []
    for r in rows:
        d = record_to_dict(r)
        bd = r["booking_date"]
        st = r["booking_status"]
        if bd >= date_type.today() and st not in ("cancelled",):
            upcoming.append(d)
        elif bd < date_type.today() or st in ("cancelled", "completed"):
            past.append(d)
    upcoming.sort(key=lambda x: (x["booking_date"], str(x["start_time"])))
    past.sort(key=lambda x: (x["booking_date"], str(x["start_time"])), reverse=True)
    return ok_json({"upcoming": upcoming, "past": past})


@router.get("/organiser-calendar")
async def organiser_calendar(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    user: dict = Depends(require_roles("organiser", "admin")),
):
    """Month view: non-cancelled bookings for the organiser's classes (admin: all)."""
    first = date_type(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    last = date_type(year, month, last_day)
    async with pool().acquire() as conn:
        if user["role"] == "admin":
            rows = await conn.fetch(
                """
                SELECT b.id AS booking_id, b.booking_date, b.start_time, b.end_time,
                       b.status::text AS booking_status, at.name AS service_name, c.full_name AS customer_name
                FROM bookings b
                JOIN appointment_types at ON at.id = b.appointment_type_id
                JOIN users c ON c.id = b.customer_id
                WHERE b.booking_date >= $1 AND b.booking_date <= $2
                  AND b.status <> 'cancelled'
                ORDER BY b.booking_date, b.start_time
                """,
                first,
                last,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT b.id AS booking_id, b.booking_date, b.start_time, b.end_time,
                       b.status::text AS booking_status, at.name AS service_name, c.full_name AS customer_name
                FROM bookings b
                JOIN appointment_types at ON at.id = b.appointment_type_id
                JOIN users c ON c.id = b.customer_id
                WHERE at.organiser_id = $1
                  AND b.booking_date >= $2 AND b.booking_date <= $3
                  AND b.status <> 'cancelled'
                ORDER BY b.booking_date, b.start_time
                """,
                user["id"],
                first,
                last,
            )
    return ok_json({"events": records_to_dicts(list(rows))})


@router.get("/appointment/{appointment_type_id}")
async def by_appointment(
    appointment_type_id: int,
    status: Optional[str] = None,
    user: dict = Depends(require_roles("organiser", "admin")),
):
    async with pool().acquire() as conn:
        at = await conn.fetchrow(
            "SELECT organiser_id FROM appointment_types WHERE id = $1",
            appointment_type_id,
        )
        if not at:
            return err_json("Not found", 404)
        if user["role"] != "admin" and at["organiser_id"] != user["id"]:
            return err_json("Forbidden", 403)
        if status:
            rows = await conn.fetch(
                """
                SELECT * FROM v_booking_details
                WHERE appointment_type_id = $1 AND booking_status = $2::booking_status
                ORDER BY booking_date ASC, start_time ASC
                """,
                appointment_type_id,
                status,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT * FROM v_booking_details
                WHERE appointment_type_id = $1
                ORDER BY booking_date ASC, start_time ASC
                """,
                appointment_type_id,
            )
        summary = await conn.fetchrow(
            """
            SELECT
              COUNT(*) FILTER (WHERE booking_status = 'pending')::int AS pending,
              COUNT(*) FILTER (WHERE booking_status = 'confirmed')::int AS confirmed,
              COUNT(*) FILTER (WHERE booking_status = 'cancelled')::int AS cancelled,
              COUNT(*) FILTER (WHERE booking_status = 'completed')::int AS completed
            FROM v_booking_details WHERE appointment_type_id = $1
            """,
            appointment_type_id,
        )
    bookings = records_to_dicts(list(rows))
    summ = record_to_dict(summary) if summary else {}
    return ok_json({"bookings": bookings, "summary": summ})


async def _fetch_booking_with_org(conn, booking_id: int):
    return await conn.fetchrow(
        """
        SELECT b.*, at.organiser_id
        FROM bookings b
        JOIN appointment_types at ON at.id = b.appointment_type_id
        WHERE b.id = $1
        """,
        booking_id,
    )


def _can_view_booking(user: dict, row) -> bool:
    if not row:
        return False
    if user["role"] == "admin":
        return True
    if user["role"] == "customer" and row["customer_id"] == user["id"]:
        return True
    if user["role"] == "organiser" and row["organiser_id"] == user["id"]:
        return True
    return False


@router.get("/{booking_id}")
async def one_booking(booking_id: int, user: dict = Depends(get_token_user)):
    async with pool().acquire() as conn:
        row = await _fetch_booking_with_org(conn, booking_id)
        if not row or not _can_view_booking(user, row):
            return err_json("Not found" if not row else "Forbidden", 404 if not row else 403)
        answers = await conn.fetch(
            """
            SELECT ba.answer_text, aq.question_text, aq.id AS question_id
            FROM booking_answers ba
            JOIN appointment_questions aq ON aq.id = ba.question_id
            WHERE ba.booking_id = $1
            """,
            booking_id,
        )
        detail = await conn.fetchrow("SELECT * FROM v_booking_details WHERE booking_id = $1", booking_id)
        base = record_to_dict(detail) if detail else record_to_dict(
            await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        )
        base["id"] = booking_id
        base["answers"] = records_to_dicts(list(answers))
    return ok_json(base)


class RescheduleBody(BaseModel):
    new_date: str
    new_start_time: str
    new_end_time: str


@router.put("/{booking_id}/reschedule")
async def reschedule(booking_id: int, body: RescheduleBody, user: dict = Depends(require_roles("customer"))):
    nd = date_type.fromisoformat(body.new_date[:10])
    new_start = _parse_time(body.new_start_time)
    new_end = _parse_time(body.new_end_time)
    if new_end <= new_start:
        return err_json("Invalid reschedule time range", 400)
    async with pool().acquire() as conn:
        async with conn.transaction():
            row = await _fetch_booking_with_org(conn, booking_id)
            if not row or row["customer_id"] != user["id"]:
                return err_json("Not found", 404)
            if row["status"] not in ("confirmed", "pending", "rescheduled"):
                return err_json("Cannot reschedule this booking", 400)
            cap = int(row["capacity_booked"] or 1)
            apt_id = row["appointment_type_id"]
            ok_slot = await conn.fetchval(
                """
                SELECT is_slot_available($1::int, $2::date, $3::time, $4::time, $5::int,
                  $6::int, $7::int)
                """,
                row["resource_id"],
                nd,
                new_start,
                new_end,
                booking_id,
                apt_id,
                cap,
            )
            if not ok_slot:
                return err_json("The selected slot is not available", 409)
            await conn.execute(
                """
                INSERT INTO reschedule_history (booking_id, old_date, old_start_time, new_date, new_start_time, rescheduled_by)
                VALUES ($1,$2,$3::time,$4,$5::time,$6)
                """,
                booking_id,
                row["booking_date"],
                row["start_time"],
                nd,
                new_start,
                user["id"],
            )
            await conn.execute(
                """
                UPDATE bookings SET booking_date = $1, start_time = $2::time, end_time = $3::time,
                  status = 'rescheduled' WHERE id = $4
                """,
                nd,
                new_start,
                new_end,
                booking_id,
            )
            out = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    return ok_json(record_to_dict(out))


class CancelBody(BaseModel):
    cancellation_reason: Optional[str] = None


@router.put("/{booking_id}/cancel")
async def cancel_booking(booking_id: int, body: CancelBody, user: dict = Depends(get_token_user)):
    async with pool().acquire() as conn:
        row = await _fetch_booking_with_org(conn, booking_id)
        if not row:
            return err_json("Not found", 404)
        allowed = False
        if user["role"] == "admin":
            allowed = True
        elif user["role"] == "customer" and row["customer_id"] == user["id"]:
            allowed = True
        elif user["role"] == "organiser" and row["organiser_id"] == user["id"]:
            allowed = True
        if not allowed:
            return err_json("Forbidden", 403)
        await conn.execute(
            """
            UPDATE bookings SET status = 'cancelled', cancellation_reason = $2
            WHERE id = $1
            """,
            booking_id,
            body.cancellation_reason,
        )
        out = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    return ok_json(record_to_dict(out))


@router.put("/{booking_id}/confirm")
async def confirm_booking(booking_id: int, user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT b.*, at.organiser_id, at.advance_payment
            FROM bookings b
            JOIN appointment_types at ON at.id = b.appointment_type_id
            WHERE b.id = $1
            """,
            booking_id,
        )
        if not row:
            return err_json("Not found", 404)
        if user["role"] != "admin" and row["organiser_id"] != user["id"]:
            return err_json("Forbidden", 403)
        if row["status"] != "pending":
            return err_json("Booking is not pending", 400)
        if row["advance_payment"] and row["payment_status"] != "paid":
            return err_json("Customer payment is required before you can confirm this booking", 400)
        await conn.execute(
            "UPDATE bookings SET status = 'confirmed'::booking_status WHERE id = $1",
            booking_id,
        )
        out = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    return ok_json(record_to_dict(out))


@router.put("/{booking_id}/complete")
async def complete_booking(booking_id: int, user: dict = Depends(require_roles("organiser", "admin"))):
    async with pool().acquire() as conn:
        row = await _fetch_booking_with_org(conn, booking_id)
        if not row:
            return err_json("Not found", 404)
        if user["role"] != "admin" and row["organiser_id"] != user["id"]:
            return err_json("Forbidden", 403)
        if row["status"] != "confirmed" or row["booking_date"] >= date_type.today():
            return err_json("Cannot complete this booking", 400)
        await conn.execute(
            "UPDATE bookings SET status = 'completed'::booking_status WHERE id = $1",
            booking_id,
        )
        out = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    return ok_json(record_to_dict(out))


@router.put("/{booking_id}/pay")
async def pay_booking(
    booking_id: int,
    user: dict = Depends(require_roles("customer")),
    settings: Settings = Depends(get_settings_dep),
):
    """
    Mock settlement when Razorpay keys are not configured (local demos only).
    """
    if settings.razorpay_key_id and settings.razorpay_key_secret:
        return err_json("Use Razorpay checkout to complete payment on this environment", 400)
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT b.*, at.confirmation_type, at.advance_payment
            FROM bookings b
            JOIN appointment_types at ON at.id = b.appointment_type_id
            WHERE b.id = $1
            """,
            booking_id,
        )
        if not row or row["customer_id"] != user["id"]:
            return err_json("Not found", 404)
        if row["payment_status"] != "pending":
            return err_json("Payment not pending", 400)
        target = (
            "confirmed"
            if row["advance_payment"] and row["confirmation_type"] == "automatic"
            else row["status"]
        )
        await conn.execute(
            """
            UPDATE bookings SET payment_status = 'paid', status = $2::booking_status
            WHERE id = $1 AND payment_status = 'pending'
            """,
            booking_id,
            target,
        )
        out = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    return ok_json(record_to_dict(out))
