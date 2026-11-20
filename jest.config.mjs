// Jest para LlegueYa (Sprint 2).
//  · unidad: reglas de la web (apps/web/js/util.js) y del borde Cloudflare (infra/cloudflare/borde).
//  · api:    reglas de negocio y seguridad contra el servidor real (FastAPI con un doble de Supabase).
// Cobertura: npm run test:cobertura → reports/jest-coverage (HTML, lcov y resumen JSON).
export default {
  projects: [
    { displayName: 'unidad', testMatch: ['<rootDir>/tests/jest/unidad/**/*.test.mjs'], transform: {}, testEnvironment: 'node' },
    {
      displayName: 'api', testMatch: ['<rootDir>/tests/jest/api/**/*.test.mjs'], transform: {}, testEnvironment: 'node',
      globalSetup: '<rootDir>/tests/jest/api/servidor.mjs', globalTeardown: '<rootDir>/tests/jest/api/detener.mjs',
    },
  ],
  collectCoverageFrom: ['apps/web/js/util.js', 'infra/cloudflare/borde/src/logica.js'],
  coverageDirectory: 'reports/jest-coverage',
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  coverageThreshold: {
    'apps/web/js/util.js': { lines: 90, branches: 90, functions: 90 },
    'infra/cloudflare/borde/src/logica.js': { lines: 90, branches: 90, functions: 90 },
  },
};
