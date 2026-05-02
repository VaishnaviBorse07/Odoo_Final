# Auth endpoints — signup, OTP, login, password reset; exports router.
import secrets
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import get_settings_dep
from app.core.config import Settings
from app.core.responses import err_json, ok_json
from app.core.security import create_token, hash_password, password_ok, verify_password
from app.db import pool
from app.services.otp_local import dev_otp_fields, log_otp

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
    async with pool().acquire() as conn:
        exists = await conn.fetchval("SELECT 1 FROM users WHERE lower(email) = lower($1)", em)
        if exists:
            return err_json("Email already registered", 409)
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
        await conn.execute(
            """
            INSERT INTO otp_verifications (user_id, email, otp_code, otp_type, expires_at)
            VALUES ($1, $2, $3, 'email_verify', NOW() + ($4::int * interval '1 minute'))
            """,
            uid,
            em,
            otp,
            settings.otp_expiry_minutes,
        )
    log_otp(em, fn, otp, "email_verify")
    payload = {"userId": uid, **dev_otp_fields(settings, otp)}
    return ok_json(payload, "Created", 201)


class VerifyOtpBody(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    otp_type: Literal["email_verify", "forgot_password"]


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpBody):
    em = str(body.email).lower().strip()
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, user_id FROM otp_verifications
            WHERE lower(email) = lower($1) AND otp_code = $2 AND otp_type = $3::otp_type_enum
              AND is_used = FALSE AND expires_at > NOW()
            """,
            em,
            body.otp_code,
            body.otp_type,
        )
        if not row:
            return err_json("Invalid or expired OTP", 400)
        await conn.execute("UPDATE otp_verifications SET is_used = TRUE WHERE id = $1", row["id"])
        if body.otp_type == "email_verify" and row["user_id"]:
            await conn.execute("UPDATE users SET status = 'active' WHERE id = $1", row["user_id"])
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
    async with pool().acquire() as conn:
        u = await conn.fetchrow(
            "SELECT id, full_name, email, status FROM users WHERE lower(email) = lower($1)",
            em,
        )
        if u and u["status"] == "active":
            otp = f"{secrets.randbelow(900000) + 100000:06d}"
            await conn.execute(
                """
                INSERT INTO otp_verifications (user_id, email, otp_code, otp_type, expires_at)
                VALUES ($1, $2, $3, 'forgot_password', NOW() + ($4::int * interval '1 minute'))
                """,
                u["id"],
                em,
                otp,
                settings.otp_expiry_minutes,
            )
            log_otp(em, u["full_name"], otp, "forgot_password")
            extra = dev_otp_fields(settings, otp)
    return ok_json(extra if extra else None, "If that email is registered, an OTP has been sent")


class ResetPasswordBody(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody):
    em = str(body.email).lower().strip()
    if not password_ok(body.new_password):
        return err_json(
            "Password must be 8+ chars with uppercase, lowercase and special character",
            400,
        )
    async with pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, user_id FROM otp_verifications
            WHERE lower(email) = lower($1) AND otp_code = $2 AND otp_type = 'forgot_password'
              AND is_used = FALSE AND expires_at > NOW()
            """,
            em,
            body.otp_code,
        )
        if not row:
            return err_json("Invalid or expired OTP", 400)
        await conn.execute("UPDATE otp_verifications SET is_used = TRUE WHERE id = $1", row["id"])
        if row["user_id"]:
            await conn.execute(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                hash_password(body.new_password),
                row["user_id"],
            )
    return ok_json(None, "Password reset successful. Please login.")


class ResendBody(BaseModel):
    email: EmailStr


@router.post("/resend-verification")
async def resend_verification(body: ResendBody, settings: Settings = Depends(get_settings_dep)):
    em = str(body.email).lower().strip()
    extra: dict = {}
    async with pool().acquire() as conn:
        u = await conn.fetchrow(
            "SELECT id, full_name, email, status FROM users WHERE lower(email) = lower($1)",
            em,
        )
        if u and u["status"] == "pending_verification":
            otp = f"{secrets.randbelow(900000) + 100000:06d}"
            await conn.execute(
                """
                INSERT INTO otp_verifications (user_id, email, otp_code, otp_type, expires_at)
                VALUES ($1, $2, $3, 'email_verify', NOW() + ($4::int * interval '1 minute'))
                """,
                u["id"],
                em,
                otp,
                settings.otp_expiry_minutes,
            )
            log_otp(em, u["full_name"], otp, "email_verify")
            extra = dev_otp_fields(settings, otp)
    return ok_json(extra if extra else None, "If pending, a new code was sent")
