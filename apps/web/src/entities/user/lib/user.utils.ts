import { DEFAULT_AVATARS, USER_ROLES } from "../model/user.constants";
import type { User } from "../model/user.schema";

/**
 * Получает отображаемое имя пользователя
 *
 * @param user - Объект пользователя
 * @returns Имя пользователя или часть email до символа @
 */
export const getUserDisplayName = (user: User): string => {
  return user.name || user.email.split("@")[0];
};

/**
 * Получает инициалы пользователя
 *
 * @param user - Объект пользователя
 * @returns Инициалы пользователя (до 2 символов в верхнем регистре)
 */
export const getUserInitials = (user: User): string => {
  const name = getUserDisplayName(user);
  const words = name.split(" ");

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
};

/**
 * Проверяет, является ли пользователь администратором
 *
 * @param user - Объект пользователя
 * @returns true, если пользователь является администратором
 */
export const isAdmin = (user: User): boolean => {
  return user.role === USER_ROLES.ADMIN;
};

/**
 * Проверяет, может ли пользователь редактировать другого пользователя
 *
 * @param currentUser - Текущий пользователь
 * @param targetUser - Целевой пользователь для редактирования
 * @returns true, если текущий пользователь может редактировать целевого
 */
export const canEditUser = (currentUser: User, targetUser: User): boolean => {
  if (isAdmin(currentUser)) return true;
  return currentUser.id === targetUser.id;
};

/**
 * Получает URL аватара пользователя
 *
 * @param user - Объект пользователя
 * @returns URL аватара пользователя или аватар по умолчанию
 */
export const getUserAvatarUrl = (user: User): string => {
  if (user.avatar) return user.avatar;
  return DEFAULT_AVATARS.NEUTRAL;
};

/**
 * Форматирует дату создания пользователя
 *
 * @param user - Объект пользователя
 * @returns Отформатированная дата создания в русской локали
 */
export const formatUserCreatedDate = (user: User): string => {
  const date = new Date(user.createdAt);
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Генерирует стабильный цвет для аватара на основе ID пользователя
 *
 * @param userId - ID пользователя
 * @returns HEX код цвета для аватара
 */
export const generateAvatarColor = (userId: number): string => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
  ];

  return colors[userId % colors.length];
};
