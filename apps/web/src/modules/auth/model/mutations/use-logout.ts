"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authApi } from "../../api/auth.api";
import { sessionKeys } from "../queries/session.keys";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      queryClient.removeQueries({ queryKey: sessionKeys.all });
      await queryClient.cancelQueries();
      queryClient.clear();
    },
  });
}
