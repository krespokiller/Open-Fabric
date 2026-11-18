# SLOT: implement this function. Everything else in this service is installed, verified and read-only.
# Rule: task, endpoint "POST /webhooks/payments", processing steps 4 to 6.
# Called by the webhook view after the signature was verified, the event was found to be new and the order was found.
# It receives the order's current status and total, and the event's type and amount_minor exactly as sent
# (the amount may be missing or not a number).
# Return what the view must do:
#   "ignore"           answer 200 and change nothing
#   "amount_mismatch"  answer 422 AMOUNT_MISMATCH and change nothing
#   "mark_paid"        mark the order paid and book the ledger transaction
#   "mark_failed"      mark the order failed and give the reserved stock back


def decide_webhook(order_status, order_total_minor, event_type, event_amount_minor) -> str:
    raise NotImplementedError("slot decide_webhook is not implemented")
