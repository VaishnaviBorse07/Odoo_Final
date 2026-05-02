# Email OTP persistence: rate limits, hashed storage, verification with attempt caps.
import asyncio
import logging
from typing import Literal, Optional, Tuple

import asyncpg

from app.core.config import Settings
from app.services.mail_smtp import build_otp_email_body, send_plain_email
from app.services.otp_crypto import hash_otp

logger = logging.getLogger(__name__)
OtpTypeStr = Literal["email_verify", "forgot_password"]


def smtp_configured(settings: Settings) -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


async def send_otp_email(
    settings: Settings,
    *,
    to_addr: str,
    recipient_name: str,
    otp_plain: str,
    purpose: str,
) -> None:
    subject = f"{settings.otp_email_subject_prefix} — {purpose}"
    body = build_otp_email_body(recipient_name=recipient_name, otp=otp_plain, purpose=purpose.lower())
    await asyncio.to_thread(
        send_plain_email,
        host=settings.smtp_host,
        port=settings.smtp_port,
        user=settings.smtp_user,
        password=settings.smtp_password,
        mail_from=settings.smtp_from,
        to_addr=to_addr,
        subject=subject,
        body=body,
        use_tls=settings.smtp_use_tls,
    )


async def check_otp_rate_limit(conn: asyncpg.Connection, email: str, settings: Settings) -> bool:
    n = await conn.fetchval(
        """
        SELECT COUNT(*)::int FROM otp_verifications
        WHERE lower(email) = lower($1) AND created_at > NOW() - INTERVAL '60 seconds'
        """,
        email,
    )
    return int(n or 0) < settings.otp_rate_limit_per_minute


async def invalidate_open_otps(conn: asyncpg.Connection, email: str, otp_type: OtpTypeStr) -> None:
    await conn.execute(
        """
        UPDATE otp_verifications SET is_used = TRUE
        WHERE lower(email) = lower($1) AND otp_type = $2::otp_type_enum AND is_used = FALSE
        """,
        email,
        otp_type,
    )


async def insert_hashed_otp(
    conn: asyncpg.Connection,
    *,
    user_id: Optional[int],
    email: str,
    otp_plain: str,
    otp_type: OtpTypeStr,
    settings: Settings,
) -> None:
    await invalidate_open_otps(conn, email, otp_type)
    h = hash_otp(email, otp_plain)
    await conn.execute(
        """
        INSERT INTO otp_verifications (user_id, email, otp_code, otp_hash, otp_type, expires_at, attempts)
        VALUES ($1, $2, NULL, $3, $4::otp_type_enum, NOW() + ($5::int * interval '1 minute'), 0)
        """,
        user_id,
        email,
        h,
        otp_type,
        settings.otp_expiry_minutes,
    )


async def consume_otp(
    conn: asyncpg.Connection,
    *,
    email: str,
    otp_plain: str,
    otp_type: OtpTypeStr,
    settings: Settings,
) -> Tuple[bool, str, Optional[int]]:
    """
    Validates latest unused OTP for email+type; increments attempts on mismatch.
    Returns (success, error_message, user_id from OTP row when success else None).
    """
    async with conn.transaction():
        row = await conn.fetchrow(
            """
            SELECT id, user_id, otp_hash, otp_code, attempts
            FROM otp_verifications
            WHERE lower(email) = lower($1) AND otp_type = $2::otp_type_enum
              AND is_used = FALSE AND expires_at > NOW()
            ORDER BY id DESC
            LIMIT 1
            FOR UPDATE
            """,
            email,
            otp_type,
        )
        if not row:
            return False, "Invalid or expired OTP", None
        if int(row["attempts"] or 0) >= settings.otp_max_attempts:
            return False, "Too many incorrect attempts. Request a new code.", None
        h = hash_otp(email, otp_plain)
        if row["otp_hash"]:
            match = h == row["otp_hash"]
        else:
            match = (row["otp_code"] or "") == otp_plain
        if not match:
            await conn.execute(
                "UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1",
                row["id"],
            )
            return False, "Invalid or expired OTP", None
        uid = row["user_id"]
        await conn.execute("UPDATE otp_verifications SET is_used = TRUE WHERE id = $1", row["id"])
        return True, "", int(uid) if uid is not None else None
