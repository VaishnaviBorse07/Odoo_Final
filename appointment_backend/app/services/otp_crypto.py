# OTP hashing (never store plain codes in new rows).
import hashlib


def hash_otp(email: str, otp_plain: str) -> str:
    key = f"zenflow|{email.lower().strip()}|{otp_plain}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
