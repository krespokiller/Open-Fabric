# SLOT: implement this function. Everything else in this service is installed, verified and read-only.
# Rule: task, endpoint "POST /webhooks/payments", the headers and processing step 1.
# Called by the webhook view with the raw request body exactly as received (bytes), the values of the X-Timestamp and
# X-Signature headers ("" when a header is missing), the webhook secret and the current time in unix seconds.
# Return True only when the request is authentic and fresh. When it returns False the view answers 401 INVALID_SIGNATURE.


def verify_webhook(raw_body: bytes, timestamp: str, signature: str, secret: str, now_seconds: float) -> bool:
    raise NotImplementedError("slot verify_webhook is not implemented")
