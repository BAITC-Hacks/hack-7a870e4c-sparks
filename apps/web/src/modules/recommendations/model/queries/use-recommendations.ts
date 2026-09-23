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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
