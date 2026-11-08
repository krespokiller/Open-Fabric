## Laravel 12: routing and controllers

Routes for this project live in `routes/api.php` (no URL prefix in this project):

```php
use App\Http\Controllers\ItemController;
use Illuminate\Support\Facades\Route;

Route::post('/items', [ItemController::class, 'store']);
Route::get('/items/{id}', [ItemController::class, 'show']);   // {id} is passed to the method as $id
```

Controllers live in `app/Http/Controllers`, extend `App\Http\Controllers\Controller` and are autoloaded by namespace (`App\...` maps to `app/...`).

```php
namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        return response()->json(['ok' => true], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['id' => $id]);
    }
}
```

**Request data.** `$request->getContent()` returns the raw body string exactly as received. `json_decode($raw, true)` parses it into arrays (`null` on invalid JSON). `$request->input('x')` and `$request->json()->all()` also read JSON input. `$request->header('X-Name', $default)` reads a header (case-insensitive).

**Responses.** `response()->json($data, $status)` encodes arrays with `json_encode` (PHP `int` becomes a JSON integer, `float` a JSON number).

**Environment.** `env('NAME', $default)` reads environment variables when the configuration is not cached (true in this project).

## Database (Laravel query builder over PDO pgsql)

```php
use Illuminate\Support\Facades\DB;

$row  = DB::selectOne('SELECT * FROM items WHERE sku = ?', [$sku]);       // stdClass or null
$rows = DB::select('SELECT * FROM items WHERE stock > ?', [0]);           // array of stdClass
$new  = DB::selectOne('INSERT INTO items (name) VALUES (?) RETURNING id', [$name]);  // $new->id
$n    = DB::update('UPDATE items SET stock = stock - ? WHERE sku = ? AND stock >= ?', [$q, $sku, $q]); // affected rows
DB::insert('INSERT INTO t (a) VALUES (?)', [$a]);                         // bool
$n    = DB::affectingStatement('INSERT ... ON CONFLICT DO NOTHING', [...]); // affected rows
DB::unprepared($sqlWithManyStatements);
```

The fluent builder also works: `DB::table('items')->where('sku', $sku)->first()`, `->decrement('stock', $q)`, `->insertGetId([...])`. Values from PostgreSQL may come back as strings depending on the driver; cast with `(int)` before returning them as numbers.

**Transactions.**

```php
$result = DB::transaction(function () use ($x) {
    // all queries here run in one transaction
    // a thrown exception rolls back and is re-thrown
    return 'ok';
});
```

Add `FOR UPDATE` to a `SELECT` inside a transaction to lock rows, or use `->lockForUpdate()` on the builder.

**Migrations.** Files in `database/migrations/` named like `2026_01_01_000000_create_items_table.php`, returning an anonymous class:

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();                          // auto-incrementing BIGINT primary key
            $table->string('sku')->unique();
            $table->bigInteger('price_minor');
            $table->integer('stock');
            $table->foreignId('owner_id')->constrained('owners');
            $table->timestamps();                  // optional created_at / updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
```

`$table->unique(['a', 'b'])` adds a composite unique index; `$table->primary(['a', 'b'])` a composite primary key. Check constraints need raw SQL (`DB::statement('ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)')`). The container runs `php artisan migrate --force` on every start.

**Eloquent** models (`app/Models/Item.php`, `class Item extends Model`) are optional; set `protected $guarded = [];` to allow mass assignment, `public $timestamps = false;` if the table has no timestamps, and `protected $primaryKey`, `public $incrementing = false; protected $keyType = 'string';` for string keys.

## HTTP client

```php
use Illuminate\Support\Facades\Http;

$res = Http::timeout(10)->withHeaders(['X-Key' => 'v'])->post($url, ['a' => 1]);  // sends JSON
$res->successful(); $res->json('field');
```

## PHP 8.3

**HMAC.** `hash_hmac('sha256', $message, $secret)` returns lowercase hex. `hash_equals($known, $given)` compares in constant time.

**Random secrets.** `bin2hex(random_bytes(24))`.

**Integers and rounding.** PHP `int` is 64-bit. `intdiv($a, $b)` and `$a % $b` give integer quotient and remainder. `round($x)` rounds halves away from zero by default; `round($x, 0, PHP_ROUND_HALF_EVEN)` rounds halves to even, but operates on floats. `is_int(1.5)` is false; `json_decode` turns `3` into `int` and `1.5` into `float`.
