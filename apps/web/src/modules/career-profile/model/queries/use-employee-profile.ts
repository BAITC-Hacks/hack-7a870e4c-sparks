"use client";

import { useQuery } from "@tanstack/react-query";

import { careerProfileApi } from "../../api/career-profile.api";
import { profileKeys } from "./profile.keys";

export function useEmployeeProfile(employeeId: string | null) {
  return useQuery({
    queryKey: profileKeys.detail(employeeId ?? ""),
    queryFn: () => careerProfileApi.getProfile(employeeId ?? ""),
    enabled: Boolean(employeeId),
  });
}
