import type { UserFilters } from "@/entities/user";

/**
 * Фабрика ключей react-query для модуля Users.
 *
 * Единый источник ключей делает инвалидацию предсказуемой:
 * - userKeys.all — корень
 * - userKeys.list(filters) — конкретный список
 * - userKeys.detail(id) — конкретный пользователь
 */
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters?: Partial<UserFilters>) =>
    [...userKeys.lists(), filters ?? {}] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};
