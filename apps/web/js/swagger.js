// Arranque de Swagger UI para /api/docs (archivo propio: la CSP no permite scripts en línea).
window.SwaggerUIBundle({
  url: '/api/openapi.json',
  dom_id: '#swagger',
  deepLinking: true,
  docExpansion: 'none',
  tryItOutEnabled: true,
  withCredentials: true,
});
