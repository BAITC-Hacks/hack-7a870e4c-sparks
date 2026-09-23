"use client";

import type { UpdateUser } from "@/entities/user";
import { updateUser } from "@/shared/api/generated";
import { useCustomMutation } from "@/shared/lib/client";
import { userKeys } from "../queries/user.keys";
import { USER_ERROR_MESSAGES, USER_SUCCESS_MESSAGES } from "../user.messages";

/**
 * Клиентская мутация поверх Orval-generated API client.
 *
 * UI работает с доменным UpdateUser, а transport DTO остается деталью model
 * слоя модуля.
 */
export const useUpdateUser = (userId: number) => {
  const mutation = useCustomMutation<
    Awaited<ReturnType<typeof updateUser>>,
    Error,
    UpdateUser
  >({
    mutationFn: (data) =>
      updateUser(String(userId), {
        id: userId,
        username: String(userId),
        firstName: data.name,
        email: data.email,
      }),
    toastConfig: {
      successMessage: USER_SUCCESS_MESSAGES.UPDATED,
      errorMessage: USER_ERROR_MESSAGES.NOT_FOUND,
    },
    customConfig: {
      invalidateQueries: [[...userKeys.lists()], [...userKeys.detail(userId)]],
    },
  });

  return {
    updateUser: mutation.mutate,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
};
