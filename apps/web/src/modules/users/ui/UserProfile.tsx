"use client";

import type React from "react";
import { useState } from "react";

import {
  formatUserCreatedDate,
  getUserDisplayName,
  USER_ROLES,
  type User,
  UserAvatar,
} from "@/entities/user";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import { useUpdateUser } from "../model/mutations/use-update-user";
import { useUserPermissions } from "../model/use-user-permissions";

export interface UserProfileProps {
  user: User;
  currentUser: User;
  onUserUpdate?: (updatedUser: User) => void;
  className?: string;
}

const roleLabels = {
  [USER_ROLES.ADMIN]: "Администратор",
  [USER_ROLES.USER]: "Пользователь",
  [USER_ROLES.MODERATOR]: "Модератор",
};

/**
 * Feature-widget: профиль пользователя с инлайн-редактированием.
 *
 * Это «умный» компонент сценария — он связывает презентационный UI из
 * entities (UserAvatar) с данными (useUpdateUser) и правами (useUserPermissions).
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  currentUser,
  onUserUpdate,
  className = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name,
    email: user.email,
  });

  const { updateUser, isUpdating } = useUpdateUser(user.id);
  const { canEditProfile } = useUserPermissions(currentUser);

  const canEdit = canEditProfile(user.id);
  const displayName = getUserDisplayName(user);
  const createdDate = formatUserCreatedDate(user);

  const handleSave = () => {
    updateUser(
      { name: editForm.name, email: editForm.email },
      {
        onSuccess: () => {
          setIsEditing(false);
          onUserUpdate?.(user);
        },
      },
    );
  };

  const handleCancel = () => {
    setEditForm({
      name: user.name,
      email: user.email,
    });
    setIsEditing(false);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
    >
      <div className="flex items-start space-x-6">
        <UserAvatar user={user} size="xl" />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            {canEdit && (
              <Button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isUpdating}
              >
                {isEditing ? "Отмена" : "Редактировать"}
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-1">Имя</Label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              ) : (
                <p className="text-gray-900">{user.name}</p>
              )}
            </div>

            <div>
              <Label className="mb-1">Email</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              ) : (
                <p className="text-gray-900">{user.email}</p>
              )}
            </div>

            <div>
              <Label className="mb-1">Роль</Label>
              <p className="text-gray-900">{roleLabels[user.role]}</p>
            </div>

            <div>
              <Label className="mb-1">Статус</Label>
              <span
                className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${
                    user.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }
                `}
              >
                {user.isActive ? "Активен" : "Неактивен"}
              </span>
            </div>

            <div>
              <Label className="mb-1">Дата регистрации</Label>
              <p className="text-gray-900">{createdDate}</p>
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 flex space-x-3">
              <Button type="button" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
              >
                Отмена
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
