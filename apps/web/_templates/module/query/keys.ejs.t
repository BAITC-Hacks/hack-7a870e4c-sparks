---
to: src/modules/<%= module %>/model/queries/<%= name %>.keys.ts
---
/**
 * Фабрика ключей TanStack Query для <%= module %>/<%= name %>.
 */
export const <%= h.changeCase.camel(name) %>Keys = {
  all: ["<%= module %>", "<%= name %>"] as const,
  lists: () => [...<%= h.changeCase.camel(name) %>Keys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...<%= h.changeCase.camel(name) %>Keys.lists(), filters ?? {}] as const,
  details: () => [...<%= h.changeCase.camel(name) %>Keys.all, "detail"] as const,
  detail: (id: number | string) =>
    [...<%= h.changeCase.camel(name) %>Keys.details(), id] as const,
};
