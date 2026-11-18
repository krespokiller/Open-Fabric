# Slot: payment webhook signature check (piece commerce.checkout).
import hashlib
import hmac

WEBHOOK_TOLERANCE_SECONDS = 300


def verify_webhook(raw_body: bytes, timestamp: str, signature: str, secret: str, now_seconds: float) -> bool:
    if not timestamp.isdigit() or abs(now_seconds - int(timestamp)) > WEBHOOK_TOLERANCE_SECONDS:
        return False
    expected = "sha256=" + hmac.new(secret.encode(), timestamp.encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
