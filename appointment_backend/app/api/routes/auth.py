# Auth endpoints — signup, OTP, login, password reset; exports router.
import logging
import secrets
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import get_settings_dep
from app.core.config import Settings
from app.core.responses import err_json, ok_json
from app.core.security import create_token, hash_password, password_ok, verify_password
from app.db import pool
from app.services.otp_email import (
    check_otp_rate_limit,
    consume_otp,
    insert_hashed_otp,
    send_otp_email,
    smtp_configured,
)
from app.services.otp_local import dev_otp_fields, log_otp_dispatched

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class SignupBody(BaseModel):
    full_name: str
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(body: SignupBody, settings: Settings = Depends(get_settings_dep)):
    fn, em, pw = body.full_name.strip(), str(body.email).lower().strip(), body.password
    if not fn or not em or not pw:
        return err_json("All fields are required", 400)
    if not password_ok(pw):
        return err_json(
            "Password must be 8+ chars with uppercase, lowercase and special character",
            400,
        )
    if not smtp_configured(settings) and not settings.dev_return_otp:
        return err_json(
            "Email verification is not available: configure SMTP (SMTP_HOST, SMTP_FROM, …) "
            "or set DEV_RETURN_OTP=true for local development only.",
            503,
        )
    async with pool().acquire() as conn:
        exists = await conn.fetchval("SELECT 1 FROM users WHERE lower(email) = lower($1)", em)
        if exists:
            return err_json("Email already registered", 409)
        if not await check_otp_rate_limit(conn, em, settings):
            return err_json("Too many verification requests. Try again in a minute.", 429)
        pwd_hash = hash_password(pw)
        uid = await conn.fetchval(
            """
            INSERT INTO users (full_name, email, password_hash, role, status)
            VALUES ($1, $2, $3, 'customer', 'pending_verification')
            RETURNING id
            """,
            fn,
            em,
            pwd_hash,
        )
        otp = f"{secrets.randbelow(900000) + 100000:06d}"
        await insert_hashed_otp(conn, user_id=uid, email=em, otp_plain=otp, otp_type="email_verify", settings=settings)
    extra: dict = {}
    if smtp_configured(settings):
        try:
            await send_otp_email(
                settings,
                to_addr=em,
                recipient_name=fn,
                otp_plain=otp,
                purpose="Email verification",
            )
        except Exception:
            logger.exception("SMTP failure during signup for %s", em)
            return err_json(
                "Could not send verification email. Check SMTP settings or try again shortly.",
                502,
            )
        log_otp_dispatched(em, fn, "email_verify")
    elif settings.dev_return_otp:
        extra = dev_otp_fields(settings, otp)
        log_otp_dispatched(em, fn, "email_verify")
    payload = {"userId": uid, **extra}
    return ok_json(payload, "Created", 201)


class VerifyOtpBody(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    otp_type: Literal["email_verify", "forgot_password"]


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpBody, settings: Settings = Depends(get_settings_dep)):
    em = str(body.email).lower().strip()
    async with pool().acquire() as conn:
        ok, msg, otp_uid = await consume_otp(
            conn,
            email=em,
            otp_plain=body.otp_code,
            otp_type=body.otp_type,
            settings=settings,
        )
        if not ok:
            return err_json(msg, 400)
        if body.otp_type == "email_verify" and otp_uid is not None:
            await conn.execute("UPDATE users SET status = 'active' WHERE id = $1", otp_uid)
    return ok_json(None, "OTP verified successfully")


class LoginBody(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
async def login(body: LoginBody, settings: Settings = Depends(get_settings_dep)):
    em = str(body.email).lower().strip()
    async with pool().acquire() as conn:
        u = await conn.fetchrow(
            "SELECT id, full_name, email, role, status, password_hash FROM users WHERE lower(email) = lower($1)",
            em,
        )
    if not u:
        return err_json("Invalid email or password", 401)
    if u["status"] == "pending_verification":
        return err_json("Please verify your email first", 403)
    if u["status"] == "inactive":
        return err_json("Account deactivated. Contact support.", 403)
    if not verify_password(body.password, u["password_hash"]):
        return err_json("Invalid email or password", 401)
    token = create_token(settings, u["id"], u["email"], u["role"])
    return ok_json(
        {
            "token": token,
            "user": {"id": u["id"], "full_name": u["full_name"], "email": u["email"], "role": u["role"]},
        },
        "OK",
    )


class ForgotBody(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(body: ForgotBody, settings: Settings = Depends(get_settings_dep)):
    em = str(body.email).lower().strip()
    extra: dict = {}
    if not smtp_configured(settings) and not settings.dev_return_otp:
        return err_json(
            "Password reset email is not available: configure SMTP or DEV_RETURN_OTP for local dev.",
            503,
        )
    async with pool().acquire() as conn:
        u = await conn.fetchrow(
            "SELECT id, full_name, email, status FROM users WHERE lower(email) = lower($1)",
            em,
        )
        if not u or u["status"] != "active":
            return ok_json(None, "If that email is registered, an OTP has been sent")
        if not await check_otp_rate_limit(conn, em, settings):
            return err_json("Too many requests. Try again in a minute.", 429)
        otp = f"{secrets.randbelow(900000) + 100000:06d}"
        await insert_hashed_otp(
            conn, user_id=u["id"], email=em, otp_plain=otp, otp_type="forgot_password", settings=settings
        )
    if smtp_configured(settings):
        try:
            await send_otp_email(
                settings,
                to_addr=em,
                recipient_name=u["full_name"] or "User",
                otp_plain=otp,
                purpose="Password reset",
            )
        except Exception:
            logger.exception("SMTP failure during forgot-password for %s", em)
            return err_json("Could not send email. Try again later.", 502)
        log_otp_dispatched(em, u["full_name"], "forgot_password")
    elif settings.dev_return_otp:
        extra = dev_otp_fields(settings, otp)
        log_otp_dispatched(em, u["full_name"], "forgot_password")
    return ok_json(extra if extra else None, "If that email is registered, an OTP has been sent")


class ResetPasswordBody(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody, settings: Settings = Depends(get_settings_dep)):
    em = str(body.email).lower().strip()
    if not password_ok(body.new_password):
        return err_json(
            "Password must be 8+ chars with uppercase, lowercase and special character",
            400,
        )
    async with pool().acquire() as conn:
        ok, msg, otp_uid = await consume_otp(
            conn,
            email=em,
            otp_plain=body.otp_code,
            otp_type="forgot_password",
            settings=settings,
        )
        if not ok:
            return err_json(msg, 400)
        if otp_uid is not None:
            await conn.execute(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                hash_password(body.new_password),
                otp_uid,
            )
    return ok_json(None, "Password reset successful. Please login.")


class ResendBody(BaseModel):
    email: EmailStr


@router.post("/resend-verification")
async def resend_verification(body: ResendBody, settings: Settings = Depends(get_settings_dep)):
    em = str(body.email).lower().strip()
    extra: dict = {}
    if not smtp_configured(settings) and not settings.dev_return_otp:
        return err_json("Email is not configured on this server.", 503)
    async with pool().acquire() as conn:
        u = await conn.fetchrow(
            "SELECT id, full_name, email, status FROM users WHERE lower(email) = lower($1)",
            em,
        )
        if not u or u["status"] != "pending_verification":
            return ok_json(None, "If pending, a new code was sent")
        if not await check_otp_rate_limit(conn, em, settings):
            return err_json("Too many requests. Try again in a minute.", 429)
        otp = f"{secrets.randbelow(900000) + 100000:06d}"
        await insert_hashed_otp(
            conn, user_id=u["id"], email=em, otp_plain=otp, otp_type="email_verify", settings=settings
        )
    if smtp_configured(settings):
        try:
            await send_otp_email(
                settings,
                to_addr=em,
                recipient_name=u["full_name"] or "User",
                otp_plain=otp,
                purpose="Email verification",
            )
        except Exception:
            logger.exception("SMTP failure during resend for %s", em)
            return err_json("Could not send email. Try again later.", 502)
        log_otp_dispatched(em, u["full_name"], "email_verify")
    elif settings.dev_return_otp:
        extra = dev_otp_fields(settings, otp)
        log_otp_dispatched(em, u["full_name"], "email_verify")
    return ok_json(extra if extra else None, "If pending, a new code was sent")
