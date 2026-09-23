---
to: src/modules/<%= module %>/model/stores/<%= module %>.store.ts
---
import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * Клиентский UI-стейт модуля <%= module %>.
 *
 * Сюда кладём только то, что НЕ является серверными данными (их кэширует
 * TanStack Query): выбор, открытые модалки, черновики и т.п.
 */
interface <%= h.changeCase.pascal(module) %>State {
  reset: () => void;
}

export const use<%= h.changeCase.pascal(module) %>Store = create<<%= h.changeCase.pascal(module) %>State>()(
  devtools(
    (set) => ({
      reset: () => set({}),
    }),
    { name: "<%= module %>-store" },
  ),
);
