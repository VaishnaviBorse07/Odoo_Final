# SMTP email delivery for OTP — uses smtplib; runs synchronously (call via asyncio.to_thread).
import smtplib
from email.message import EmailMessage


def send_plain_email(
    *,
    host: str,
    port: int,
    user: str,
    password: str,
    mail_from: str,
    to_addr: str,
    subject: str,
    body: str,
    use_tls: bool = True,
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = to_addr
    msg.set_content(body)
    with smtplib.SMTP(host, port, timeout=30) as smtp:
        if use_tls:
            smtp.starttls()
        if user and password:
            smtp.login(user, password)
        smtp.send_message(msg)


def build_otp_email_body(*, recipient_name: str, otp: str, purpose: str) -> str:
    lines = [
        f"Hello {recipient_name},",
        "",
        f"Your ZenFlow verification code ({purpose}) is:",
        "",
        f"  {otp}",
        "",
        "This code expires in a few minutes. If you did not request it, ignore this email.",
        "",
        "— ZenFlow",
    ]
    return "\n".join(lines)
