package com.example.shop;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ShopController {
    private static final Logger log = LoggerFactory.getLogger(ShopController.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public ShopController(JdbcTemplate jdbc, TransactionTemplate tx, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.mapper = mapper;
    }

    record Caller(boolean admin, Long customerId) {}

    record Line(String sku, int qty) {}

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> onApiError(ApiException e) {
        return ResponseEntity.status(e.status).body(Map.of("error", e.code));
    }

    private Caller caller(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) return null;
        String key = authorization.substring(7).trim();
        String admin = System.getenv("ADMIN_KEY");
        if (admin != null && MessageDigest.isEqual(admin.getBytes(StandardCharsets.UTF_8), key.getBytes(StandardCharsets.UTF_8))) {
            return new Caller(true, null);
        }
        List<Long> ids = jdbc.queryForList("SELECT id FROM customers WHERE api_key = ?", Long.class, key);
        return ids.isEmpty() ? null : new Caller(false, ids.get(0));
    }

    private Caller requireCaller(String authorization) {
        Caller c = caller(authorization);
        if (c == null) throw new ApiException(401, "UNAUTHORIZED");
        return c;
    }

    private void requireAdmin(String authorization) {
        if (!requireCaller(authorization).admin()) throw new ApiException(403, "FORBIDDEN");
    }

    private JsonNode parse(String raw) {
        try {
            return raw == null || raw.isBlank() ? null : mapper.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private static Map<String, Object> productView(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sku", row.get("sku"));
        m.put("name", row.get("name"));
        m.put("price_minor", ((Number) row.get("price_minor")).longValue());
        m.put("stock", ((Number) row.get("stock")).intValue());
        return m;
    }

    @PostMapping("/products")
    public ResponseEntity<?> createProduct(@RequestHeader(value = "Authorization", required = false) String auth,
                                           @RequestBody(required = false) String raw) {
        requireAdmin(auth);
        JsonNode b = parse(raw);
        boolean valid = b != null && b.path("sku").isTextual() && !b.path("sku").asText().isEmpty()
                && b.path("name").isTextual() && b.path("price_minor").isIntegralNumber() && b.path("price_minor").asLong() >= 0
                && b.path("stock").isIntegralNumber() && b.path("stock").asLong() >= 0;
        if (!valid) throw new ApiException(422, "INVALID_PRODUCT");
        List<Map<String, Object>> rows = jdbc.queryForList(
                "INSERT INTO products (sku, name, price_minor, stock) VALUES (?, ?, ?, ?) ON CONFLICT (sku) DO NOTHING RETURNING *",
                b.get("sku").asText(), b.get("name").asText(), b.get("price_minor").asLong(), b.get("stock").asInt());
        if (rows.isEmpty()) throw new ApiException(409, "SKU_EXISTS");
        return ResponseEntity.status(201).body(productView(rows.get(0)));
    }

    @GetMapping("/products/{sku}")
    public ResponseEntity<?> getProduct(@RequestHeader(value = "Authorization", required = false) String auth,
                                        @PathVariable String sku) {
        requireCaller(auth);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM products WHERE sku = ?", sku);
        if (rows.isEmpty()) throw new ApiException(404, "NOT_FOUND");
        return ResponseEntity.ok(productView(rows.get(0)));
    }

    @PostMapping("/customers")
    public ResponseEntity<?> createCustomer(@RequestHeader(value = "Authorization", required = false) String auth,
                                            @RequestBody(required = false) String raw) {
        requireAdmin(auth);
        JsonNode b = parse(raw);
        if (b == null || !b.path("email").isTextual() || !b.path("name").isTextual()) throw new ApiException(422, "INVALID_CUSTOMER");
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        String apiKey = HexFormat.of().formatHex(bytes);
        Long id = jdbc.queryForObject("INSERT INTO customers (email, name, api_key) VALUES (?, ?, ?) RETURNING id", Long.class,
                b.get("email").asText(), b.get("name").asText(), apiKey);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", id);
        out.put("email", b.get("email").asText());
        out.put("name", b.get("name").asText());
        out.put("api_key", apiKey);
        return ResponseEntity.status(201).body(out);
    }

    private static List<Line> parseCart(JsonNode body) {
        if (body == null || !body.path("items").isArray() || body.path("items").isEmpty()) return null;
        Set<String> seen = new LinkedHashSet<>();
        List<Line> lines = new ArrayList<>();
        for (JsonNode it : body.get("items")) {
            JsonNode sku = it.path("sku");
            JsonNode qty = it.path("qty");
            if (!sku.isTextual() || !qty.isIntegralNumber() || qty.asLong() < 1 || qty.asLong() > Integer.MAX_VALUE) return null;
            if (!seen.add(sku.asText())) return null;
            lines.add(new Line(sku.asText(), qty.asInt()));
        }
        return lines;
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@RequestHeader(value = "Authorization", required = false) String auth,
                                      @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                      @RequestBody(required = false) String raw) throws Exception {
        Caller c = requireCaller(auth);
        if (c.admin()) throw new ApiException(403, "FORBIDDEN");
        long customerId = c.customerId();
        if (key == null || key.isEmpty()) throw new ApiException(400, "IDEMPOTENCY_KEY_REQUIRED");
        JsonNode body = parse(raw);
        List<Line> lines = parseCart(body);
        if (lines == null) throw new ApiException(422, "INVALID_CART");
        String requestHash = body.toString();

        Object[] outcome = tx.execute(status -> {
            int claimed = jdbc.update(
                    "INSERT INTO idempotency_keys (customer_id, key, request_hash) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                    customerId, key, requestHash);
            if (claimed == 0) {
                List<Map<String, Object>> prior = jdbc.queryForList(
                        "SELECT request_hash, response_status, response_body FROM idempotency_keys WHERE customer_id = ? AND key = ? FOR UPDATE",
                        customerId, key);
                if (prior.isEmpty()) throw new ApiException(409, "IDEMPOTENCY_RETRY");
                Map<String, Object> p = prior.get(0);
                if (!requestHash.equals(p.get("request_hash"))) throw new ApiException(422, "IDEMPOTENCY_CONFLICT");
                if (p.get("response_status") == null) throw new ApiException(409, "IDEMPOTENCY_IN_PROGRESS");
                return new Object[] {true, ((Number) p.get("response_status")).intValue(), p.get("response_body")};
            }

            Map<String, Long> prices = new HashMap<>();
            for (Line l : lines) {
                List<Long> found = jdbc.queryForList("SELECT price_minor FROM products WHERE sku = ?", Long.class, l.sku());
                if (found.isEmpty()) throw new ApiException(422, "INVALID_CART");
                prices.put(l.sku(), found.get(0));
            }
            List<Line> ordered = new ArrayList<>(lines);
            ordered.sort((a, b) -> a.sku().compareTo(b.sku()));
            for (Line l : ordered) {
                int updated = jdbc.update("UPDATE products SET stock = stock - ? WHERE sku = ? AND stock >= ?", l.qty(), l.sku(), l.qty());
                if (updated != 1) throw new ApiException(409, "OUT_OF_STOCK");
            }
            long subtotal = 0;
            for (Line l : lines) subtotal += prices.get(l.sku()) * l.qty();
            Boolean hasPaid = jdbc.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = ? AND status = 'paid')", Boolean.class, customerId);
            long discount = Discount.compute(subtotal, !Boolean.TRUE.equals(hasPaid));
            long total = subtotal - discount;
            Long orderId = jdbc.queryForObject(
                    "INSERT INTO orders (customer_id, status, subtotal_minor, discount_minor, total_minor) VALUES (?, 'pending', ?, ?, ?) RETURNING id",
                    Long.class, customerId, subtotal, discount, total);
            for (Line l : lines) {
                jdbc.update("INSERT INTO order_items (order_id, sku, qty, unit_price_minor) VALUES (?, ?, ?, ?)",
                        orderId, l.sku(), l.qty(), prices.get(l.sku()));
            }
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("order_id", orderId);
            response.put("status", "pending");
            response.put("subtotal_minor", subtotal);
            response.put("discount_minor", discount);
            response.put("total_minor", total);
            String json;
            try {
                json = mapper.writeValueAsString(response);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
            jdbc.update("UPDATE idempotency_keys SET response_status = 201, response_body = ? WHERE customer_id = ? AND key = ?",
                    json, customerId, key);
            return new Object[] {false, 201, json, orderId, total};
        });

        boolean replay = (Boolean) outcome[0];
        if (!replay) requestCharge((Long) outcome[3], (Long) outcome[4]);
        return ResponseEntity.status((Integer) outcome[1])
                .header("Content-Type", "application/json")
                .body(outcome[2]);
    }

    private void requestCharge(long orderId, long amount) {
        try {
            String payload = mapper.writeValueAsString(Map.of("order_id", orderId, "amount_minor", amount));
            HttpRequest req = HttpRequest.newBuilder(URI.create(System.getenv("PSP_URL") + "/charges"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .header("Idempotency-Key", String.valueOf(orderId))
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 200) {
                String chargeId = mapper.readTree(res.body()).path("charge_id").asText(null);
                jdbc.update("UPDATE orders SET charge_id = ? WHERE id = ?", chargeId, orderId);
            }
        } catch (Exception e) {
            log.warn("charge request failed for order {}", orderId, e);
        }
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<?> getOrder(@RequestHeader(value = "Authorization", required = false) String auth,
                                      @PathVariable String id) {
        Caller c = requireCaller(auth);
        if (!id.matches("\\d{1,18}")) throw new ApiException(404, "NOT_FOUND");
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM orders WHERE id = ?", Long.parseLong(id));
        if (rows.isEmpty()) throw new ApiException(404, "NOT_FOUND");
        Map<String, Object> o = rows.get(0);
        if (!c.admin() && ((Number) o.get("customer_id")).longValue() != c.customerId()) throw new ApiException(404, "NOT_FOUND");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", ((Number) o.get("id")).longValue());
        out.put("status", o.get("status"));
        out.put("subtotal_minor", ((Number) o.get("subtotal_minor")).longValue());
        out.put("discount_minor", ((Number) o.get("discount_minor")).longValue());
        out.put("total_minor", ((Number) o.get("total_minor")).longValue());
        return ResponseEntity.ok(out);
    }

    private static boolean validSignature(String raw, String ts, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            String secret = System.getenv().getOrDefault("WEBHOOK_SECRET", "");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = "sha256=" + HexFormat.of().formatHex(mac.doFinal((ts + "." + raw).getBytes(StandardCharsets.UTF_8)));
            return signature != null && MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }

    @PostMapping("/webhooks/payments")
    public ResponseEntity<?> paymentsWebhook(@RequestHeader(value = "X-Timestamp", required = false) String ts,
                                             @RequestHeader(value = "X-Signature", required = false) String signature,
                                             @RequestBody(required = false) String raw) {
        String body = raw == null ? "" : raw;
        if (ts == null || !ts.matches("\\d{1,12}") || Math.abs(System.currentTimeMillis() / 1000 - Long.parseLong(ts)) > 300
                || !validSignature(body, ts, signature)) {
            throw new ApiException(401, "INVALID_SIGNATURE");
        }
        JsonNode event = parse(body);
        if (event == null || !event.path("id").isTextual()) throw new ApiException(400, "INVALID_EVENT");
        String type = event.path("type").asText("");
        if (!type.equals("charge.succeeded") && !type.equals("charge.failed")) throw new ApiException(400, "INVALID_EVENT");
        String orderIdText = event.path("order_id").asText("");

        String result = tx.execute(status -> {
            int fresh = jdbc.update("INSERT INTO webhook_events (id) VALUES (?) ON CONFLICT DO NOTHING", event.get("id").asText());
            if (fresh == 0) return "duplicate";
            if (!orderIdText.matches("\\d{1,18}")) throw new ApiException(404, "NOT_FOUND");
            List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM orders WHERE id = ? FOR UPDATE", Long.parseLong(orderIdText));
            if (rows.isEmpty()) throw new ApiException(404, "NOT_FOUND");
            Map<String, Object> o = rows.get(0);
            long orderId = ((Number) o.get("id")).longValue();
            if (!"pending".equals(o.get("status"))) return "ignored";
            long total = ((Number) o.get("total_minor")).longValue();
            long discount = ((Number) o.get("discount_minor")).longValue();
            long subtotal = ((Number) o.get("subtotal_minor")).longValue();
            if (type.equals("charge.succeeded")) {
                JsonNode amount = event.path("amount_minor");
                if (!amount.isIntegralNumber() || amount.asLong() != total) throw new ApiException(422, "AMOUNT_MISMATCH");
                jdbc.update("UPDATE orders SET status = 'paid' WHERE id = ?", orderId);
                String txId = "order-" + orderId + "-paid";
                jdbc.update("INSERT INTO ledger_entries (tx_id, account, side, amount_minor) VALUES (?, 'psp_receivable', 'debit', ?)", txId, total);
                if (discount > 0) {
                    jdbc.update("INSERT INTO ledger_entries (tx_id, account, side, amount_minor) VALUES (?, 'discounts_given', 'debit', ?)", txId, discount);
                }
                jdbc.update("INSERT INTO ledger_entries (tx_id, account, side, amount_minor) VALUES (?, 'sales', 'credit', ?)", txId, subtotal);
            } else {
                jdbc.update("UPDATE orders SET status = 'failed' WHERE id = ?", orderId);
                jdbc.update("UPDATE products p SET stock = p.stock + i.qty FROM order_items i WHERE i.order_id = ? AND i.sku = p.sku", orderId);
            }
            return "ok";
        });
        return ResponseEntity.ok(Map.of("ok", true, "result", result));
    }

    @GetMapping("/ledger/summary")
    public ResponseEntity<?> ledgerSummary(@RequestHeader(value = "Authorization", required = false) String auth) {
        requireAdmin(auth);
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT
                  COALESCE(SUM(amount_minor) FILTER (WHERE side = 'debit'), 0) AS debits_minor,
                  COALESCE(SUM(amount_minor) FILTER (WHERE side = 'credit'), 0) AS credits_minor,
                  COALESCE(SUM(amount_minor) FILTER (WHERE side = 'credit' AND account = 'sales'), 0) AS sales_minor,
                  COALESCE(SUM(amount_minor) FILTER (WHERE side = 'debit' AND account = 'discounts_given'), 0) AS discounts_minor
                FROM ledger_entries""");
        Map<String, Object> out = new LinkedHashMap<>();
        for (String k : List.of("debits_minor", "credits_minor", "sales_minor", "discounts_minor")) {
            out.put(k, ((Number) row.get(k)).longValue());
        }
        return ResponseEntity.ok(out);
    }
}
