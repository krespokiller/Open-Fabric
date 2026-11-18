# SLOT: implement this function. Everything else in this service is installed, verified and read-only.
# Rule: task, endpoint "POST /checkout", the sentence about invalid carts.
# Called by the checkout view with the parsed JSON body of the request: any JSON value, or None when the body is not JSON.
# Return the cart lines as a list of (sku, qty) tuples in the order they were sent, or None when the cart is invalid.
# Whether each sku exists is checked afterwards against the database, not here.


def parse_cart(body):
    raise NotImplementedError("slot parse_cart is not implemented")
