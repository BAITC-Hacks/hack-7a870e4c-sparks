---
to: src/modules/<%= module %>/api/<%= module %>.api.ts
---
/**
 * Опциональный ручной transport adapter модуля <%= module %>.
 *
 * Обычно модульные hooks импортируют Orval-generated функции напрямую из
 * `@/shared/api/generated`. Этот файл нужен только для нестандартных случаев:
 * composite request, upload/download, SSE/WebSocket, polling или legacy endpoint.
 */
export {};
