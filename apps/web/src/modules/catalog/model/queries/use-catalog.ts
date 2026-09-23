"use client";

import { useQuery } from "@tanstack/react-query";

import { catalogApi } from "../../api/catalog.api";
import { catalogKeys } from "./catalog.keys";

export function useCatalog() {
  return useQuery({
    queryKey: catalogKeys.all,
    queryFn: catalogApi.getCatalog,
    staleTime: 5 * 60 * 1000,
    meta: { requiresSession: true },
    retry: false,
  });
}
