---
to: src/modules/<%= module %>/model/mutations/use-<%= name %>.ts
---
"use client";

import { useCustomMutation } from "@/shared/lib/client";

/**
 * Mutation hook модуля <%= module %>.
 *
 * Импортируйте Orval-generated mutation function из `@/shared/api/generated`.
 * Invalidation и optimistic updates держите здесь, а не в UI.
 */
export function use<%= h.changeCase.pascal(name) %>() {
  return useCustomMutation<unknown, Error, unknown>({
    mutationFn: async () => {
      throw new Error("Подключите Orval-generated mutation function");
    },
  });
}
