<?php

namespace App\Shop;

final class Discount
{
    public const THRESHOLD_MINOR = 10_000_000;
    public const CAP_MINOR = 3_000_000;

    public static function compute(int $subtotalMinor, bool $isNewCustomer): int
    {
        if (! $isNewCustomer || $subtotalMinor < self::THRESHOLD_MINOR) {
            return 0;
        }
        $q = intdiv($subtotalMinor, 10);
        $r = $subtotalMinor % 10;
        if ($r > 5 || ($r === 5 && $q % 2 === 1)) {
            $q += 1;
        }

        return min($q, self::CAP_MINOR);
    }
}
