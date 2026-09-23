---
to: src/entities/<%= name %>/model/<%= name %>.schema.ts
---
import { z } from "zod";

/**
 * Источник истины для доменной сущности <%= h.changeCase.pascal(name) %>.
 */
export const <%= name %>Schema = z.object({
  id: z.number().positive(),
});

export type <%= h.changeCase.pascal(name) %> = z.infer<typeof <%= name %>Schema>;
