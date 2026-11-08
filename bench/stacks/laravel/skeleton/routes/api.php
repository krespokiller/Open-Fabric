<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Routes in this file have no URL prefix (see bootstrap/app.php) and no rate limiting.
Route::get('/health', function () {
    DB::select('SELECT 1');

    return response()->json(['ok' => true]);
});
