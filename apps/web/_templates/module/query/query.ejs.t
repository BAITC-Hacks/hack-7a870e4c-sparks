---
to: src/modules/<%= module %>/model/queries/use-<%= name %>.ts
---
import { useQuery } from "@tanstack/react-query";

import { <%= h.changeCase.camel(name) %>Keys } from "./<%= name %>.keys";

/**
 * Query hook модуля <%= module %>.
 *
 * Импортируйте Orval-generated функцию из `@/shared/api/generated` и держите
 * queryKey/enabled/select/mapping внутри module model слоя.
 */
export function use<%= h.changeCase.pascal(name) %>(id: string) {
  return useQuery({
    queryKey: <%= h.changeCase.camel(name) %>Keys.detail(id),
    queryFn: async () => {
      throw new Error("Подключите Orval-generated query function");
    },
    enabled: Boolean(id),
  });
}
