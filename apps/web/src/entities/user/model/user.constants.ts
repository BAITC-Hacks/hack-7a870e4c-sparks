/**
 * Доменные константы пользователя (роли, статусы, дефолтные аватары).
 *
 * Здесь живут только «факты о домене», стабильные и переиспользуемые.
 * Тексты сообщений (ошибки/успех) и пагинация — это уже уровень фичи,
 * поэтому они лежат в модуле, а не здесь.
 */
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  MODERATOR: "moderator",
} as const;

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
} as const;

export const DEFAULT_AVATARS = {
  MALE: "/avatars/default-male.png",
  FEMALE: "/avatars/default-female.png",
  NEUTRAL: "/avatars/default-neutral.png",
} as const;
