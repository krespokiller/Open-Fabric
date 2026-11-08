# shop

A standard Laravel 12 application (PHP 8.3) with PostgreSQL. Only the files that differ from a fresh
`laravel/laravel` install are shown here; everything else (`app/`, `config/`, `database/`, `vendor/`, ...)
exists as in a new Laravel 12 project and is created when the Docker image is built.

- `bootstrap/app.php` loads `routes/api.php` with no URL prefix, so a route `/checkout` is served at `/checkout`.
- The `api` middleware group has no rate limiting and no session or CSRF.
- Database: PostgreSQL via `DB_CONNECTION=pgsql`; `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` and `DB_PASSWORD` are set from the container environment.
- On start the container runs `php artisan migrate --force` (so migrations in `database/migrations/` run on every start) and then `php artisan serve --no-reload` on port 8080 with 8 PHP workers.
- Add models in `app/Models`, controllers in `app/Http/Controllers`, migrations in `database/migrations`.
