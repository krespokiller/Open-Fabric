## Spring Boot 3.5 web (Spring MVC)

```java
@RestController
public class ItemController {
    @PostMapping("/items")
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String auth,
                                    @RequestBody(required = false) String raw) {
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("id", id));
    }
}
```

**Request body.** `@RequestBody String raw` receives the raw body exactly as sent (the `StringHttpMessageConverter` handles any content type). `@RequestBody SomeRecord dto` binds JSON with Jackson; a body that does not match the type causes a `400` before your code runs, so reading `String` (or `JsonNode`) gives you control over validation. `required = false` allows an empty body (`null`).

**Headers.** `@RequestHeader(value = "Idempotency-Key", required = false) String key` is `null` when absent. Header names are case-insensitive.

**Responses.** `ResponseEntity.status(code).body(obj)` serializes `obj` with Jackson (maps, records, lists). A `String` body is written as-is; set `.contentType(MediaType.APPLICATION_JSON)` if it contains JSON.

**Errors.** An `@ExceptionHandler(MyException.class)` method in the controller (or in a `@RestControllerAdvice` class) turns exceptions into responses.

**Jackson.** Inject `ObjectMapper`. `mapper.readTree(raw)` returns a `JsonNode`: `node.path("x")` never returns null (missing values are `MissingNode`), `isTextual()`, `isIntegralNumber()` (false for `1.5`), `isArray()`, `asText()`, `asLong()`. `mapper.writeValueAsString(obj)` serializes.

## Spring JDBC

`JdbcTemplate` is auto-configured from `spring.datasource.*`:

```java
Long id = jdbc.queryForObject("INSERT INTO items (name) VALUES (?) RETURNING id", Long.class, name);
List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM items WHERE sku = ?", sku);
List<Long> ids = jdbc.queryForList("SELECT id FROM items WHERE x = ?", Long.class, x);
int updated = jdbc.update("UPDATE items SET stock = stock - ? WHERE sku = ? AND stock >= ?", qty, sku, qty);
```

`queryForObject` throws `EmptyResultDataAccessException` when no row is found; `queryForList` returns an empty list. `update` returns the number of affected rows. In a `Map` row, `BIGINT` columns are `Long`, `INTEGER` columns are `Integer`; cast through `Number` to be safe.

**Transactions.** Inject `TransactionTemplate`:

```java
String result = tx.execute(status -> {
    // all jdbc calls here run in one transaction
    // throwing a RuntimeException rolls back and propagates
    return "ok";
});
```

Alternatively annotate a public method of a Spring bean with `@Transactional`; it is not applied to calls from within the same class.

**Schema initialization.** With `spring.sql.init.mode=always`, `src/main/resources/schema.sql` runs on every start; statements are separated by `;`. Use `CREATE TABLE IF NOT EXISTS` so restarts work.

## Java 21 standard library

**HMAC.**

```java
Mac mac = Mac.getInstance("HmacSHA256");
mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
String hex = HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
boolean same = MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8)); // constant time
```

**Random secrets.** `SecureRandom` plus `HexFormat.of().formatHex(bytes)`.

**HTTP client.**

```java
HttpClient http = HttpClient.newHttpClient();
HttpRequest req = HttpRequest.newBuilder(URI.create(url))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();
HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
```

**Environment.** `System.getenv("NAME")` returns `null` when unset.

**Integers and rounding.** `long` is 64-bit. `a / b` and `a % b` on longs truncate toward zero. `Math.round(double)` rounds halves up. `new BigDecimal(x).setScale(0, RoundingMode.HALF_EVEN)` rounds halves to even exactly; `BigDecimal.valueOf(long)` avoids float conversion.
