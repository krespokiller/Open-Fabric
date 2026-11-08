package com.example.shop;

public final class Discount {
    public static final long THRESHOLD_MINOR = 10_000_000L;
    public static final long CAP_MINOR = 3_000_000L;

    private Discount() {}

    public static long compute(long subtotalMinor, boolean isNewCustomer) {
        if (!isNewCustomer || subtotalMinor < THRESHOLD_MINOR) return 0;
        long q = subtotalMinor / 10;
        long r = subtotalMinor % 10;
        if (r > 5 || (r == 5 && q % 2 == 1)) q += 1;
        return Math.min(q, CAP_MINOR);
    }
}
