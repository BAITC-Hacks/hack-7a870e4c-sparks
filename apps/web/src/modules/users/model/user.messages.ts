/**
 * Тексты и лимиты уровня фичи (не домена).
 *
 * Сообщения и пагинация — это про конкретный сценарий «управление
 * пользователями», поэтому они живут в модуле, а не в entities.
 */
export const USER_ERROR_MESSAGES = {
  NOT_FOUND: "Пользователь не найден",
  EMAIL_EXISTS: "Пользователь с таким email уже существует",
  INVALID_CREDENTIALS: "Неверные учетные данные",
  ACCESS_DENIED: "Доступ запрещен",
  ACCOUNT_SUSPENDED: "Аккаунт заблокирован",
} as const;

export const USER_SUCCESS_MESSAGES = {
  CREATED: "Пользователь успешно создан",
  UPDATED: "Пользователь успешно обновлен",
  DELETED: "Пользователь успешно удален",
  ACTIVATED: "Пользователь активирован",
  DEACTIVATED: "Пользователь деактивирован",
} as const;

export const PAGINATION_LIMITS = {
  DEFAULT: 10,
  SMALL: 5,
  LARGE: 20,
  MAX: 100,
} as const;
