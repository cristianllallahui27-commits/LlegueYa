# LlegueYa — imagen de la aplicación (API + sitio web estático en un solo proceso).
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
 && useradd --create-home appuser \
 && mkdir -p /app/data/fotos/catalogo && chown -R appuser /app/data
COPY services/ services/
COPY apps/web/ apps/web/
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=4s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health',timeout=3).status==200 else 1)"
CMD ["uvicorn", "services.gateway.composicion:crear_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
