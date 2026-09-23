"use client";

import { useQuery } from "@tanstack/react-query";
import { recommendationsApi } from "../../api/recommendations.api";
import { mapRecommendations } from "../mappers/recommendations.mapper";
import { recommendationsKeys } from "./recommendations.keys";

export function useRecommendations(employeeId: string | null) {
  return useQuery({
    queryKey: recommendationsKeys.detail(employeeId ?? ""),
    queryFn: () => recommendationsApi.getRecommendations(employeeId ?? ""),
    select: mapRecommendations,
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
