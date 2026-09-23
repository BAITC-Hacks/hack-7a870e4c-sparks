"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LoginBodyOne } from "@/shared/api/generated";

import { authApi } from "../../api/auth.api";
import { sessionKeys } from "../queries/session.keys";

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginBodyOne) => authApi.login(credentials),
    onSuccess: async (user) => {
      queryClient.setQueryData(sessionKeys.current(), user);
      await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}
