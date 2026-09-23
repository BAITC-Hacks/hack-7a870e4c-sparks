"use client";

import { useQuery } from "@tanstack/react-query";

import { careerPlanApi } from "../../api/career-plan.api";
import { careerPlanKeys } from "./career-plan.keys";

export function useCareerPlan(employeeId: string | null) {
  return useQuery({
    queryKey: careerPlanKeys.detail(employeeId ?? ""),
    queryFn: () => careerPlanApi.getPlan(employeeId ?? ""),
    enabled: Boolean(employeeId),
    staleTime: 60_000,
    meta: { requiresSession: true },
    // A plan may require AI generation. Retry only on the user's explicit action.
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}
