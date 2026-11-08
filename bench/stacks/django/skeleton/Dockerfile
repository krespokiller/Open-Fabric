FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn shop.wsgi -b 0.0.0.0:8080 -w 2 --threads 4 --access-logfile -"]
