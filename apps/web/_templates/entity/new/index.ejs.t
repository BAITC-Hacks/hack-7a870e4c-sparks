---
to: src/entities/<%= name %>/index.ts
---
/**
 * Публичный API сущности <%= h.changeCase.pascal(name) %>.
 *
 * Entities — переиспользуемые доменные «кирпичи» (схема/типы, чистые утилиты,
 * презентационный UI). Без бизнес-сценариев и без знания о модулях.
 */
export type { <%= h.changeCase.pascal(name) %> } from "./model/<%= name %>.schema";
export { <%= name %>Schema } from "./model/<%= name %>.schema";
