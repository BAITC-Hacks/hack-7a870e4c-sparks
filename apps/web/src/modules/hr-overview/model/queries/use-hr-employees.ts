"use client";

import { useQuery } from "@tanstack/react-query";

import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";

import { hrOverviewApi } from "../../api/hr-overview.api";
import { hrEmployeesKeys } from "./hr-overview.keys";

export function useHrEmployees(enabled = true) {
  return useQuery({
    queryKey: hrEmployeesKeys.all,
    queryFn: hrOverviewApi.getEmployees,
    enabled,
    refetchOnMount: true,
    retry: (failureCount, error) =>
      ![401, 403].includes(getApiErrorStatus(error) ?? 0) && failureCount < 1,
  });
}
