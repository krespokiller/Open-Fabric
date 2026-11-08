import os

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "bench-not-secret")
DEBUG = False
ALLOWED_HOSTS = ["*"]
APPEND_SLASH = False

INSTALLED_APPS = [
    "core",
]

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "shop.urls"
WSGI_APPLICATION = "shop.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
        "NAME": os.environ.get("DB_NAME", "bench"),
        "USER": os.environ.get("DB_USER", "bench"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"

LOGGING = {
    "version": 1,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}
