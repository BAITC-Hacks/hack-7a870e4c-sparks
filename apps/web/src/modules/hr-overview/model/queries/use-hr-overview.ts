"use client";

import { useQuery } from "@tanstack/react-query";

import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";

import { hrOverviewApi } from "../../api/hr-overview.api";
import { hrOverviewKeys } from "./hr-overview.keys";

export function useHrOverview(enabled = true) {
  return useQuery({
    queryKey: hrOverviewKeys.all,
    queryFn: hrOverviewApi.getOverview,
    enabled,
    refetchOnMount: true,
    retry: (failureCount, error) =>
      ![401, 403].includes(getApiErrorStatus(error) ?? 0) && failureCount < 1,
  });
}
