/**
 * Публичный API модуля Users.
 *
 * Реэкспортируйте здесь только то, что нужно снаружи модуля:
 * UI сценария, query hooks, mutation hooks и прикладные model helpers.
 */

export { useUpdateUser } from "./model/mutations/use-update-user";
export { userKeys } from "./model/queries/user.keys";
export { UserProfile } from "./ui/UserProfile";
