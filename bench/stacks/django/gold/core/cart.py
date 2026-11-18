# Slot: checkout cart shape validation (piece commerce.checkout).


def parse_cart(body):
    """Return the cart as a list of (sku, qty) tuples, or None when the body is not a valid cart."""
    items = body.get("items") if isinstance(body, dict) else None
    if not isinstance(items, list) or not items:
        return None
    seen, lines = set(), []
    for it in items:
        if not isinstance(it, dict) or not isinstance(it.get("sku"), str):
            return None
        qty = it.get("qty")
        if not isinstance(qty, int) or isinstance(qty, bool) or qty < 1:
            return None
        if it["sku"] in seen:
            return None
        seen.add(it["sku"])
        lines.append((it["sku"], qty))
    return lines
