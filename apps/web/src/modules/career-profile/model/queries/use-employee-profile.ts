"use client";

import { useQuery } from "@tanstack/react-query";

import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";

import { careerProfileApi } from "../../api/career-profile.api";
import { profileKeys } from "./profile.keys";

export function useEmployeeProfile(
  employeeId: string | null,
  options: { refetchOnMount?: boolean } = {},
) {
  return useQuery({
    queryKey: profileKeys.detail(employeeId ?? ""),
    queryFn: () => careerProfileApi.getProfile(employeeId ?? ""),
    enabled: Boolean(employeeId),
    ...(options.refetchOnMount === undefined
      ? {}
      : { refetchOnMount: options.refetchOnMount }),
    retry: (failureCount, error) =>
      ![401, 403, 404].includes(getApiErrorStatus(error) ?? 0) &&
      failureCount < 1,
  });
}
