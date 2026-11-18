# SLOT: implement this function. Everything else in this service is installed, verified and read-only.
# Rule: task, paragraph "New-customer discount".
# Called by the checkout view with the cart subtotal in integer minor units and whether the customer is new.
# Return the discount in integer minor units, 0 when no discount applies.


def compute_discount(subtotal_minor: int, is_new_customer: bool) -> int:
    raise NotImplementedError("slot compute_discount is not implemented")
