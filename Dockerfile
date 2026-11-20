# Imagen única de servicios Python de LlegueYa. Cada contenedor elige su servicio
# con SERVICIO (gateway | identidad | catalogo | comunidad); ver compose.yaml.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 SERVICIO=gateway
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home appuser
COPY services/ services/
COPY apps/web/ apps/web/
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health' if '${SERVICIO}' in ('gateway','identidad') else 'http://127.0.0.1:8000/api/v1/catalogo/destinos' if '${SERVICIO}'=='catalogo' else 'http://127.0.0.1:8000/api/v1/comunidad/muro').status==200 else 1)"
CMD ["sh", "-c", "exec uvicorn services.${SERVICIO}.composicion:crear_app --factory --host 0.0.0.0 --port 8000 --no-access-log --proxy-headers"]
