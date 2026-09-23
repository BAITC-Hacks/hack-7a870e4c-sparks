import type React from "react";

import {
  generateAvatarColor,
  getUserAvatarUrl,
  getUserInitials,
} from "../lib/user.utils";
import type { User } from "../model/user.schema";

export interface UserAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg" | "xl";
  showOnline?: boolean;
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

/**
 * Презентационный аватар пользователя.
 *
 * Чистый компонент (только пропсы, без состояния/эффектов), поэтому
 * остаётся серверным — без директивы "use client". Может рендериться
 * как в server-, так и в client-дереве.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = "md",
  showOnline = false,
  isOnline = false,
  className = "",
}) => {
  const initials = getUserInitials(user);
  const avatarUrl = getUserAvatarUrl(user);
  const backgroundColor = generateAvatarColor(user.id);

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full flex items-center justify-center
          bg-cover bg-center border-2 border-white shadow-sm
          font-medium text-white
        `}
        style={{
          backgroundImage: avatarUrl.startsWith("/")
            ? `url(${avatarUrl})`
            : undefined,
          backgroundColor: avatarUrl.startsWith("/")
            ? undefined
            : backgroundColor,
        }}
      >
        {!avatarUrl.startsWith("/") && initials}
      </div>

      {showOnline && (
        <div
          className={`
            absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
            ${isOnline ? "bg-green-500" : "bg-gray-400"}
          `}
        />
      )}
    </div>
  );
};
