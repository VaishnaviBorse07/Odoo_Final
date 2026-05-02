# Razorpay webhook — payment.captured / payment.failed; signature verified when secret is set.
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.api.deps import get_settings_dep
from app.core.config import Settings
from app.core.responses import err_json, ok_json
from app.db import pool
from app.services.booking_payment import apply_successful_payment

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])


def _razorpay_client(settings: Settings):
    if not (settings.razorpay_key_id and settings.razorpay_key_secret):
        return None
    import razorpay

    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


@router.post("/razorpay-webhook")
async def razorpay_webhook(request: Request, settings: Settings = Depends(get_settings_dep)):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature") or ""
    if settings.razorpay_webhook_secret:
        client = _razorpay_client(settings)
        if not client:
            return err_json("Razorpay not configured", 503)
        try:
            client.utility.verify_webhook_signature(body.decode("utf-8"), sig, settings.razorpay_webhook_secret)
        except Exception:
            logger.warning("Razorpay webhook signature verification failed")
            return err_json("Invalid signature", 400)
    else:
        logger.warning("RAZORPAY_WEBHOOK_SECRET is empty — webhook signatures are not verified")
    try:
        payload: dict[str, Any] = json.loads(body.decode("utf-8"))
    except Exception:
        return err_json("Invalid JSON", 400)
    event = payload.get("event") or ""
    if event == "payment.captured":
        ent = (((payload.get("payload") or {}).get("payment") or {}).get("entity")) or {}
        order_id = ent.get("order_id")
        pay_id = ent.get("id")
        amount = ent.get("amount")
        if not order_id or not pay_id or amount is None:
            return ok_json({"ignored": True}, "OK")
        async with pool().acquire() as conn:
            prow = await conn.fetchrow(
                "SELECT booking_id FROM payments WHERE order_id = $1",
                str(order_id),
            )
            if not prow:
                return ok_json({"ignored": True}, "OK")
            bid = int(prow["booking_id"])
            async with conn.transaction():
                await apply_successful_payment(
                    conn,
                    booking_id=bid,
                    razorpay_order_id=str(order_id),
                    razorpay_payment_id=str(pay_id),
                    amount_paise_from_gateway=int(amount),
                    raw_payload=payload,
                )
        return ok_json(None, "OK")
    if event == "payment.failed":
        ent = (((payload.get("payload") or {}).get("payment") or {}).get("entity")) or {}
        order_id = ent.get("order_id")
        if order_id:
            async with pool().acquire() as conn:
                await conn.execute(
                    """
                    UPDATE payments SET status = 'FAILED', raw_response = $2::jsonb, updated_at = NOW()
                    WHERE order_id = $1 AND status NOT IN ('SUCCESS','FAILED')
                    """,
                    str(order_id),
                    payload,
                )
        return ok_json(None, "OK")
    return ok_json({"ignored": True}, "OK")
