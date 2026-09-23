import type { User } from "@/entities/user";

/**
 * Правила доступа сценария «управление пользователями».
 *
 * @param currentUser - Текущий пользователь
 * @returns Набор предикатов проверки прав
 */
export const useUserPermissions = (currentUser: User) => {
  const canEditProfile = (targetUserId: number) => {
    return currentUser.id === targetUserId || currentUser.role === "admin";
  };

  const canDeleteUser = (targetUserId: number) => {
    return currentUser.role === "admin" && currentUser.id !== targetUserId;
  };

  const canViewUserDetails = (targetUserId: number) => {
    return currentUser.id === targetUserId || currentUser.role === "admin";
  };

  return {
    canEditProfile,
    canDeleteUser,
    canViewUserDetails,
  };
};
