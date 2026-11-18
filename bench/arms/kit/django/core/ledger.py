# SLOT: implement this function. Everything else in this service is installed, verified and read-only.
# Rule: task, endpoint "POST /webhooks/payments", processing step 5 (the ledger transaction).
# Called by the webhook view when an order is marked paid, with the order's subtotal, discount and total
# in integer minor units. The view stores the entries you return as one transaction.
# Return the entries of that transaction as a list of dicts with the keys "account", "side" ("debit" or "credit")
# and "amount_minor".


def ledger_entries(subtotal_minor, discount_minor, total_minor) -> list[dict]:
    raise NotImplementedError("slot ledger_entries is not implemented")
