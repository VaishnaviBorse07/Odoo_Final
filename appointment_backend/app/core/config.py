# Loads environment settings for ZenFlow API — exports Settings singleton.
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str = "change_me"
    jwt_expires_in: str = "7d"
    otp_expiry_minutes: int = 5
    otp_max_attempts: int = 5
    otp_rate_limit_per_minute: int = 3
    port: int = 8000
    # When true, signup/forgot/resend responses include otp_code for local testing only.
    dev_return_otp: bool = False
    # SMTP (smtplib) for signup / forgot-password OTP delivery.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True
    otp_email_subject_prefix: str = "ZenFlow"
    # Razorpay (https://razorpay.com) — INR; Checkout supports UPI incl. Google Pay / PhonePe.
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    # Dashboard → Webhooks → signing secret 
    razorpay_webhook_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
