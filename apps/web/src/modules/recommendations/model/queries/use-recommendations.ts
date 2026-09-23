"use client";

import { useQuery } from "@tanstack/react-query";
import { recommendationsApi } from "../../api/recommendations.api";
import { recommendationKeys } from "./recommendations.keys";

export function useRecommendations(employeeId: string | null) {
  return useQuery({
    queryKey: recommendationKeys.detail(employeeId ?? ""),
    queryFn: () => recommendationsApi.getRecommendations(employeeId ?? ""),
    enabled: Boolean(employeeId),
    meta: { requiresSession: true },
    // This POST runs on entry and explicit refresh, not every focus or render.
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
