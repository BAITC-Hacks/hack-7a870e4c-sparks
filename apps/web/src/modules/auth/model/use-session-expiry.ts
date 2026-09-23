"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useRouter } from "@/shared/configs/i18/navigation";
import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";

import { sessionKeys } from "./queries/session.keys";

// Only protected scenarios use this hook; public errors never expire a session.
export function useSessionExpiry(error: unknown) {
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    if (getApiErrorStatus(error) !== 401) return;
    void queryClient.cancelQueries();
    queryClient.clear();
    queryClient.setQueryData(sessionKeys.current(), null);
    router.replace("/login");
  }, [error, queryClient, router]);
}
