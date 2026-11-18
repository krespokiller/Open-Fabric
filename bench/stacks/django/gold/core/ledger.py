# Slot: ledger entries of the balanced transaction for a paid order (piece commerce.checkout).


def ledger_entries(subtotal_minor, discount_minor, total_minor) -> list[dict]:
    entries = [{"account": "psp_receivable", "side": "debit", "amount_minor": total_minor}]
    if discount_minor > 0:
        entries.append({"account": "discounts_given", "side": "debit", "amount_minor": discount_minor})
    entries.append({"account": "sales", "side": "credit", "amount_minor": subtotal_minor})
    return entries
