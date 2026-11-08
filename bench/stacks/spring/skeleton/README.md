# shop

Spring Boot 3.5 (Java 21) web application with PostgreSQL through Spring JDBC (`JdbcTemplate`).

- Package: `com.example.shop`. `HealthController` serves `GET /health`.
- Database settings come from the `DB_*` environment variables (`src/main/resources/application.properties`).
- `spring.sql.init.mode=always`: if `src/main/resources/schema.sql` exists, it runs on every start.
- The Docker image builds with Maven and runs the jar on port 8080.
