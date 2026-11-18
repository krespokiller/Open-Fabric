# Slot: decision for a verified payment event on an existing order (piece commerce.checkout).


def decide_webhook(order_status, order_total_minor, event_type, event_amount_minor) -> str:
    """Return one of "ignore", "amount_mismatch", "mark_paid" or "mark_failed"."""
    if order_status != "pending":
        return "ignore"
    if event_type == "charge.succeeded":
        return "amount_mismatch" if event_amount_minor != order_total_minor else "mark_paid"
    return "mark_failed"
