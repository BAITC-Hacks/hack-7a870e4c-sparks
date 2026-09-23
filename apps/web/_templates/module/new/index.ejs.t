---
to: src/modules/<%= name %>/index.ts
---
/**
 * Публичный API модуля <%= name %>.
 *
 * Реэкспортируйте здесь только то, что нужно снаружи модуля:
 * UI сценария, query hooks, mutation hooks и прикладные model helpers.
 *
 * Сегменты модуля добавляйте ПО МЕРЕ НЕОБХОДИМОСТИ, а не заранее:
 *   pnpm g:component   # ui/<Component>.tsx
 *   pnpm g:api         # api/<module>.api.ts, только если нужен ручной transport adapter
 *   pnpm g:query       # model/queries/use-<name>.ts + <name>.keys.ts
 *   pnpm g:mutation    # model/mutations/use-<name>.ts
 *   pnpm g:store       # model/stores/<name>.store.ts
 */
export {};
