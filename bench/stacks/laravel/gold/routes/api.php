<?php

use App\Http\Controllers\ShopController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Routes in this file have no URL prefix (see bootstrap/app.php) and no rate limiting.
Route::get('/health', function () {
    DB::select('SELECT 1');

    return response()->json(['ok' => true]);
});

Route::post('/products', [ShopController::class, 'createProduct']);
Route::get('/products/{sku}', [ShopController::class, 'getProduct']);
Route::post('/customers', [ShopController::class, 'createCustomer']);
Route::post('/checkout', [ShopController::class, 'checkout']);
Route::get('/orders/{id}', [ShopController::class, 'getOrder']);
Route::post('/webhooks/payments', [ShopController::class, 'paymentsWebhook']);
Route::get('/ledger/summary', [ShopController::class, 'ledgerSummary']);
