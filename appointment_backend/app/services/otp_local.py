# Local OTP handling — no third-party email; logs OTP and optional dev-only API echo.
import logging
from typing import Literal

from app.core.config import Settings

logger = logging.getLogger(__name__)
OtpType = Literal["email_verify", "forgot_password"]


def log_otp(email: str, name: str, otp: str, otp_type: OtpType) -> None:
    logger.warning(
        "ZenFlow OTP [%s] email=%s name=%s code=%s (check server logs; no external mail)",
        otp_type,
        email,
        name,
        otp,
    )


def dev_otp_fields(settings: Settings, otp: str) -> dict:
    if not settings.dev_return_otp:
        return {}
    return {
        "otp_code": otp,
        "_dev_only": "Set DEV_RETURN_OTP=false in production. OTP is only echoed when this flag is true.",
    }
