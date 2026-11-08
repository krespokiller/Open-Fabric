<?php

namespace App\Http\Controllers;

use App\Shop\ApiError;
use App\Shop\Discount;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ShopController extends Controller
{
    private function guard(Closure $fn): JsonResponse
    {
        try {
            return $fn();
        } catch (ApiError $e) {
            return response()->json(['error' => $e->errorCode], $e->status);
        }
    }

    /** @return array{0: string, 1: ?int}|null */
    private function caller(Request $request): ?array
    {
        $header = (string) $request->header('Authorization', '');
        if (stripos($header, 'Bearer ') !== 0) {
            return null;
        }
        $key = trim(substr($header, 7));
        $admin = (string) env('ADMIN_KEY', '');
        if ($admin !== '' && hash_equals($admin, $key)) {
            return ['admin', null];
        }
        $row = DB::selectOne('SELECT id FROM customers WHERE api_key = ?', [$key]);

        return $row ? ['customer', (int) $row->id] : null;
    }

    private function requireCaller(Request $request): array
    {
        $c = $this->caller($request);
        if (! $c) {
            throw new ApiError(401, 'UNAUTHORIZED');
        }

        return $c;
    }

    private function requireAdmin(Request $request): void
    {
        if ($this->requireCaller($request)[0] !== 'admin') {
            throw new ApiError(403, 'FORBIDDEN');
        }
    }

    private function body(Request $request): mixed
    {
        $raw = $request->getContent();

        return $raw === '' ? null : json_decode($raw, true);
    }

    private static function productView(object $p): array
    {
        return ['sku' => $p->sku, 'name' => $p->name, 'price_minor' => (int) $p->price_minor, 'stock' => (int) $p->stock];
    }

    public function createProduct(Request $request): JsonResponse
    {
        return $this->guard(function () use ($request) {
            $this->requireAdmin($request);
            $b = $this->body($request);
            $valid = is_array($b) && is_string($b['sku'] ?? null) && $b['sku'] !== '' && is_string($b['name'] ?? null)
                && is_int($b['price_minor'] ?? null) && $b['price_minor'] >= 0 && is_int($b['stock'] ?? null) && $b['stock'] >= 0;
            if (! $valid) {
                throw new ApiError(422, 'INVALID_PRODUCT');
            }
            $row = DB::selectOne(
                'INSERT INTO products (sku, name, price_minor, stock) VALUES (?, ?, ?, ?) ON CONFLICT (sku) DO NOTHING RETURNING *',
                [$b['sku'], $b['name'], $b['price_minor'], $b['stock']]
            );
            if (! $row) {
                throw new ApiError(409, 'SKU_EXISTS');
            }

            return response()->json(self::productView($row), 201);
        });
    }

    public function getProduct(Request $request, string $sku): JsonResponse
    {
        return $this->guard(function () use ($request, $sku) {
            $this->requireCaller($request);
            $row = DB::selectOne('SELECT * FROM products WHERE sku = ?', [$sku]);
            if (! $row) {
                throw new ApiError(404, 'NOT_FOUND');
            }

            return response()->json(self::productView($row));
        });
    }

    public function createCustomer(Request $request): JsonResponse
    {
        return $this->guard(function () use ($request) {
            $this->requireAdmin($request);
            $b = $this->body($request);
            if (! is_array($b) || ! is_string($b['email'] ?? null) || ! is_string($b['name'] ?? null)) {
                throw new ApiError(422, 'INVALID_CUSTOMER');
            }
            $apiKey = bin2hex(random_bytes(24));
            $row = DB::selectOne('INSERT INTO customers (email, name, api_key) VALUES (?, ?, ?) RETURNING id', [$b['email'], $b['name'], $apiKey]);

            return response()->json(['id' => (int) $row->id, 'email' => $b['email'], 'name' => $b['name'], 'api_key' => $apiKey], 201);
        });
    }

    /** @return array<int, array{sku: string, qty: int}>|null */
    private static function parseCart(mixed $body): ?array
    {
        $items = is_array($body) ? ($body['items'] ?? null) : null;
        if (! is_array($items) || $items === [] || ! array_is_list($items)) {
            return null;
        }
        $seen = [];
        $lines = [];
        foreach ($items as $it) {
            if (! is_array($it) || ! is_string($it['sku'] ?? null) || ! is_int($it['qty'] ?? null) || $it['qty'] < 1) {
                return null;
            }
            if (isset($seen[$it['sku']])) {
                return null;
            }
            $seen[$it['sku']] = true;
            $lines[] = ['sku' => $it['sku'], 'qty' => $it['qty']];
        }

        return $lines;
    }

    public function checkout(Request $request): JsonResponse
    {
        return $this->guard(function () use ($request) {
            [$role, $customerId] = $this->requireCaller($request);
            if ($role !== 'customer') {
                throw new ApiError(403, 'FORBIDDEN');
            }
            $key = (string) $request->header('Idempotency-Key', '');
            if ($key === '') {
                throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED');
            }
            $body = $this->body($request);
            $lines = self::parseCart($body);
            if ($lines === null) {
                throw new ApiError(422, 'INVALID_CART');
            }
            $hash = json_encode($body);

            $outcome = DB::transaction(function () use ($customerId, $key, $hash, $lines) {
                $claimed = DB::affectingStatement(
                    'INSERT INTO idempotency_keys (customer_id, key, request_hash) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
                    [$customerId, $key, $hash]
                );
                if ($claimed === 0) {
                    $prior = DB::selectOne(
                        'SELECT request_hash, response_status, response_body FROM idempotency_keys WHERE customer_id = ? AND key = ? FOR UPDATE',
                        [$customerId, $key]
                    );
                    if (! $prior) {
                        throw new ApiError(409, 'IDEMPOTENCY_RETRY');
                    }
                    if ($prior->request_hash !== $hash) {
                        throw new ApiError(422, 'IDEMPOTENCY_CONFLICT');
                    }
                    if ($prior->response_status === null) {
                        throw new ApiError(409, 'IDEMPOTENCY_IN_PROGRESS');
                    }

                    return ['replay' => true, 'status' => (int) $prior->response_status, 'body' => json_decode($prior->response_body, true)];
                }

                $prices = [];
                foreach ($lines as $l) {
                    $p = DB::selectOne('SELECT price_minor FROM products WHERE sku = ?', [$l['sku']]);
                    if (! $p) {
                        throw new ApiError(422, 'INVALID_CART');
                    }
                    $prices[$l['sku']] = (int) $p->price_minor;
                }
                $ordered = $lines;
                usort($ordered, fn ($a, $b) => strcmp($a['sku'], $b['sku']));
                foreach ($ordered as $l) {
                    $n = DB::update('UPDATE products SET stock = stock - ? WHERE sku = ? AND stock >= ?', [$l['qty'], $l['sku'], $l['qty']]);
                    if ($n !== 1) {
                        throw new ApiError(409, 'OUT_OF_STOCK');
                    }
                }
                $subtotal = 0;
                foreach ($lines as $l) {
                    $subtotal += $prices[$l['sku']] * $l['qty'];
                }
                $hasPaid = DB::selectOne("SELECT 1 AS x FROM orders WHERE customer_id = ? AND status = 'paid' LIMIT 1", [$customerId]);
                $discount = Discount::compute($subtotal, $hasPaid === null);
                $total = $subtotal - $discount;
                $order = DB::selectOne(
                    "INSERT INTO orders (customer_id, status, subtotal_minor, discount_minor, total_minor) VALUES (?, 'pending', ?, ?, ?) RETURNING id",
                    [$customerId, $subtotal, $discount, $total]
                );
                $orderId = (int) $order->id;
                foreach ($lines as $l) {
                    DB::insert('INSERT INTO order_items (order_id, sku, qty, unit_price_minor) VALUES (?, ?, ?, ?)', [$orderId, $l['sku'], $l['qty'], $prices[$l['sku']]]);
                }
                $response = ['order_id' => $orderId, 'status' => 'pending', 'subtotal_minor' => $subtotal, 'discount_minor' => $discount, 'total_minor' => $total];
                DB::update('UPDATE idempotency_keys SET response_status = 201, response_body = ? WHERE customer_id = ? AND key = ?', [json_encode($response), $customerId, $key]);

                return ['replay' => false, 'status' => 201, 'body' => $response];
            });

            if (! $outcome['replay']) {
                $this->requestCharge($outcome['body']['order_id'], $outcome['body']['total_minor']);
            }

            return response()->json($outcome['body'], $outcome['status']);
        });
    }

    private function requestCharge(int $orderId, int $amount): void
    {
        try {
            $res = Http::timeout(10)
                ->withHeaders(['Idempotency-Key' => (string) $orderId])
                ->post(rtrim((string) env('PSP_URL'), '/').'/charges', ['order_id' => $orderId, 'amount_minor' => $amount]);
            if ($res->successful()) {
                DB::update('UPDATE orders SET charge_id = ? WHERE id = ?', [$res->json('charge_id'), $orderId]);
            }
        } catch (Throwable $e) {
            Log::warning('charge request failed', ['order' => $orderId, 'error' => $e->getMessage()]);
        }
    }

    public function getOrder(Request $request, string $id): JsonResponse
    {
        return $this->guard(function () use ($request, $id) {
            [$role, $customerId] = $this->requireCaller($request);
            if (! preg_match('/^\d{1,18}$/', $id)) {
                throw new ApiError(404, 'NOT_FOUND');
            }
            $o = DB::selectOne('SELECT * FROM orders WHERE id = ?', [(int) $id]);
            if (! $o || ($role === 'customer' && (int) $o->customer_id !== $customerId)) {
                throw new ApiError(404, 'NOT_FOUND');
            }

            return response()->json([
                'id' => (int) $o->id,
                'status' => $o->status,
                'subtotal_minor' => (int) $o->subtotal_minor,
                'discount_minor' => (int) $o->discount_minor,
                'total_minor' => (int) $o->total_minor,
            ]);
        });
    }

    public function paymentsWebhook(Request $request): JsonResponse
    {
        return $this->guard(function () use ($request) {
            $raw = $request->getContent();
            $ts = (string) $request->header('X-Timestamp', '');
            $signature = (string) $request->header('X-Signature', '');
            $expected = 'sha256='.hash_hmac('sha256', $ts.'.'.$raw, (string) env('WEBHOOK_SECRET', ''));
            if (! ctype_digit($ts) || abs(time() - (int) $ts) > 300 || ! hash_equals($expected, $signature)) {
                throw new ApiError(401, 'INVALID_SIGNATURE');
            }
            $event = json_decode($raw, true);
            if (! is_array($event) || ! is_string($event['id'] ?? null) || ! in_array($event['type'] ?? null, ['charge.succeeded', 'charge.failed'], true)) {
                throw new ApiError(400, 'INVALID_EVENT');
            }

            $result = DB::transaction(function () use ($event) {
                if (DB::affectingStatement('INSERT INTO webhook_events (id) VALUES (?) ON CONFLICT DO NOTHING', [$event['id']]) === 0) {
                    return 'duplicate';
                }
                $orderId = (string) ($event['order_id'] ?? '');
                if (! preg_match('/^\d{1,18}$/', $orderId)) {
                    throw new ApiError(404, 'NOT_FOUND');
                }
                $o = DB::selectOne('SELECT * FROM orders WHERE id = ? FOR UPDATE', [(int) $orderId]);
                if (! $o) {
                    throw new ApiError(404, 'NOT_FOUND');
                }
                if ($o->status !== 'pending') {
                    return 'ignored';
                }
                $id = (int) $o->id;
                if ($event['type'] === 'charge.succeeded') {
                    if (! is_int($event['amount_minor'] ?? null) || $event['amount_minor'] !== (int) $o->total_minor) {
                        throw new ApiError(422, 'AMOUNT_MISMATCH');
                    }
                    DB::update("UPDATE orders SET status = 'paid' WHERE id = ?", [$id]);
                    $txId = "order-{$id}-paid";
                    DB::insert("INSERT INTO ledger_entries (tx_id, account, side, amount_minor) VALUES (?, 'psp_receivable', 'debit', ?)", [$txId, (int) $o->total_minor]);
                    if ((int) $o->discount_minor > 0) {
                        DB::insert("INSERT INTO ledger_entries (tx_id, account, side, amount_minor) VALUES (?, 'discounts_given', 'debit', ?)", [$txId, (int) $o->discount_minor]);
                    }
                    DB::insert("INSERT INTO ledger_entries (tx_id, account, side, amount_minor) VALUES (?, 'sales', 'credit', ?)", [$txId, (int) $o->subtotal_minor]);
                } else {
                    DB::update("UPDATE orders SET status = 'failed' WHERE id = ?", [$id]);
                    DB::update('UPDATE products p SET stock = p.stock + i.qty FROM order_items i WHERE i.order_id = ? AND i.sku = p.sku', [$id]);
                }

                return 'ok';
            });

            return response()->json(['ok' => true, 'result' => $result]);
        });
    }

    public function ledgerSummary(Request $request): JsonResponse
    {
        return $this->guard(function () use ($request) {
            $this->requireAdmin($request);
            $r = DB::selectOne("
                SELECT
                  COALESCE(SUM(amount_minor) FILTER (WHERE side = 'debit'), 0) AS debits_minor,
                  COALESCE(SUM(amount_minor) FILTER (WHERE side = 'credit'), 0) AS credits_minor,
                  COALESCE(SUM(amount_minor) FILTER (WHERE side = 'credit' AND account = 'sales'), 0) AS sales_minor,
                  COALESCE(SUM(amount_minor) FILTER (WHERE side = 'debit' AND account = 'discounts_given'), 0) AS discounts_minor
                FROM ledger_entries");

            return response()->json([
                'debits_minor' => (int) $r->debits_minor,
                'credits_minor' => (int) $r->credits_minor,
                'sales_minor' => (int) $r->sales_minor,
                'discounts_minor' => (int) $r->discounts_minor,
            ]);
        });
    }
}
