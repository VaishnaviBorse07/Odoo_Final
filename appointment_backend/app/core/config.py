# Loads environment settings for ZenFlow API — exports Settings singleton.
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str = "change_me"
    jwt_expires_in: str = "7d"
    otp_expiry_minutes: int = 10
    port: int = 8000
    # When true, signup/forgot/resend responses include otp_code for local testing only.
    dev_return_otp: bool = False
    # Razorpay (https://razorpay.com) — INR; Checkout supports UPI incl. Google Pay / PhonePe.
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()

