FROM php:8.3-cli
RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev libzip-dev \
    && docker-php-ext-install pdo_pgsql zip bcmath \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
# A standard Laravel 12 application; the project files are copied on top of it.
RUN composer create-project laravel/laravel:^12.0 . --no-interaction --prefer-dist --no-scripts \
    && cp .env.example .env
COPY . /app/
RUN (composer install --no-interaction --prefer-dist --no-scripts || composer update --no-interaction --prefer-dist --no-scripts) \
    && composer dump-autoload -o \
    && php artisan key:generate --force
ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr DB_CONNECTION=pgsql PHP_CLI_SERVER_WORKERS=8
EXPOSE 8080
CMD ["sh", "-c", "export DB_DATABASE=\"$DB_NAME\" DB_USERNAME=\"$DB_USER\"; php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8080 --no-reload"]
