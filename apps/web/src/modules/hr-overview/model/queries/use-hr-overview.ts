"use client";

import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/modules/auth";

import { hrOverviewApi } from "../../api/hr-overview.api";
import { hrOverviewKeys } from "./hr-overview.keys";

export function useHrOverview() {
  const session = useSession();
  return useQuery({
    queryKey: hrOverviewKeys.overview(),
    queryFn: hrOverviewApi.getOverview,
    enabled: session.isSuccess && session.data?.role === "hr",
    meta: { requiresSession: true },
    retry: false,
    staleTime: 30_000,
    refetchOnMount: true,
  });
}
