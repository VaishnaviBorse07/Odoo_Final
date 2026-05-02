# Shared Razorpay settlement: mark payment + booking (idempotent for verify + webhook races).
from decimal import Decimal
from typing import Any, Optional

import asyncpg


async def apply_successful_payment(
    conn: asyncpg.Connection,
    *,
    booking_id: int,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    amount_paise_from_gateway: int,
    raw_payload: dict[str, Any],
) -> Optional[dict]:
    """
    Returns current booking row after success (or if already paid for this order);
    None when order is unknown, booking mismatch, or amount mismatch.
    """
    row = await conn.fetchrow(
        """
        SELECT b.id, b.payment_status, b.status, b.payment_amount,
               at.confirmation_type, at.advance_payment
        FROM bookings b
        JOIN appointment_types at ON at.id = b.appointment_type_id
        WHERE b.id = $1
        """,
        booking_id,
    )
    if not row:
        return None
    pay_row = await conn.fetchrow(
        "SELECT id, booking_id, status FROM payments WHERE order_id = $1",
        razorpay_order_id,
    )
    if not pay_row or int(pay_row["booking_id"]) != booking_id:
        return None
    expected_paise = int(Decimal(str(row["payment_amount"] or 0)) * 100)
    if abs(int(amount_paise_from_gateway) - expected_paise) > 1:
        return None
    if row["payment_status"] == "paid" and pay_row["status"] == "SUCCESS":
        out = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
        return dict(out) if out else None
    await conn.execute(
        """
        UPDATE payments
        SET payment_id = $2, status = 'SUCCESS', raw_response = $3::jsonb, updated_at = NOW()
        WHERE id = $1 AND status IS DISTINCT FROM 'SUCCESS'
        """,
        pay_row["id"],
        razorpay_payment_id,
        raw_payload,
    )
    if row["payment_status"] != "paid":
        if row["advance_payment"] and row["confirmation_type"] == "automatic":
            target = "confirmed"
        else:
            target = row["status"]
        await conn.execute(
            """
            UPDATE bookings
            SET payment_status = 'paid', status = $2::booking_status, updated_at = NOW()
            WHERE id = $1 AND payment_status = 'pending'
            """,
            booking_id,
            target,
        )
    out = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    return dict(out) if out else None
