<?php

namespace App\Shop;

use RuntimeException;

class ApiError extends RuntimeException
{
    public function __construct(public int $status, public string $errorCode)
    {
        parent::__construct($errorCode);
    }
}
