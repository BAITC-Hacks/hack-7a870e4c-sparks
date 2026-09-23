"use client";

import { useQuery } from "@tanstack/react-query";

import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";

import { authApi } from "../../api/auth.api";
import { sessionKeys } from "./session.keys";

export function useSession() {
  return useQuery({
    queryKey: sessionKeys.current(),
    queryFn: async () => {
      try {
        return await authApi.getSession();
      } catch (error) {
        if (getApiErrorStatus(error) === 401) return null;
        throw error;
      }
    },
    retry: (failureCount, error) =>
      getApiErrorStatus(error) !== 401 && failureCount < 1,
  });
}
