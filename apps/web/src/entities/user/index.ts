/**
 * Публичный API сущности User.
 *
 * Entities — это переиспользуемые доменные «кирпичи»: схема/типы,
 * чистые утилиты и презентационный UI. Они НЕ содержат бизнес-сценариев
 * (это уровень modules) и не знают о существовании модулей.
 */
export {
  canEditUser,
  formatUserCreatedDate,
  generateAvatarColor,
  getUserAvatarUrl,
  getUserDisplayName,
  getUserInitials,
  isAdmin,
} from "./lib/user.utils";
export {
  DEFAULT_AVATARS,
  USER_ROLES,
  USER_STATUS,
} from "./model/user.constants";
export type {
  CreateUser,
  UpdateUser,
  User,
  UserFilters,
} from "./model/user.schema";
export {
  createUserSchema,
  updateUserSchema,
  userFiltersSchema,
  userSchema,
} from "./model/user.schema";
export { UserAvatar } from "./ui/UserAvatar";
export { UserCard } from "./ui/UserCard";
