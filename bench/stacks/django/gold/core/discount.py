DISCOUNT_THRESHOLD_MINOR = 10_000_000
DISCOUNT_CAP_MINOR = 3_000_000


def compute_discount(subtotal_minor: int, is_new_customer: bool) -> int:
    if not is_new_customer or subtotal_minor < DISCOUNT_THRESHOLD_MINOR:
        return 0
    q, r = divmod(subtotal_minor, 10)
    if r > 5 or (r == 5 and q % 2 == 1):
        q += 1
    return min(q, DISCOUNT_CAP_MINOR)
