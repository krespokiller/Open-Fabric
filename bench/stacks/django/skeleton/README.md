# shop

Django 5.2 project used as a JSON API with PostgreSQL.

- Settings: `shop/settings.py` (database from `DB_*` environment variables, `APPEND_SLASH = False`).
- URLs: `shop/urls.py`. Views and models live in the `core` app.
- On start the container runs `python manage.py migrate` and then gunicorn on port 8080 (2 workers x 4 threads).
- There is no CSRF middleware and no session or auth app installed.
