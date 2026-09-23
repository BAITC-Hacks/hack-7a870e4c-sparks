"use client";

import {
  CancelledError,
  type Query,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import type { SessionUser } from "@/entities/session";
import { useSession } from "@/modules/auth";
import { ApiError } from "@/shared/lib/client/custom-instance";

import { dataImportApi, type ImportPayload } from "../../api/data-import.api";
import { MAX_IMPORT_BYTES, payloadSize } from "../../lib/validate-import";

type ImportRequest = {
  payload: ImportPayload;
  sessionQuery: Query | undefined;
  username: string | undefined;
};
const sessionKey = ["session", "current"] as const;
const affectedKeys = new Set([
  "hr-overview",
  "employees",
  "catalog",
  "employee-profile",
  "recommendations",
  "career-plan",
  "career-advisor",
]);
const affected = (query: Query) => affectedKeys.has(String(query.queryKey[0]));

export function useImportData() {
  const queryClient = useQueryClient();
  const session = useSession();
  const currentSessionQuery = () =>
    queryClient.getQueryCache().find({ queryKey: sessionKey, exact: true });
  function isCurrent(request: ImportRequest) {
    const user = queryClient.getQueryData<SessionUser | null>(sessionKey);
    return (
      request.sessionQuery === currentSessionQuery() &&
      user?.role === "hr" &&
      user.username === request.username &&
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.state.variables === request)
    );
  }

  const mutation = useMutation({
    scope: { id: "data-import" },
    meta: { requiresSession: true },
    retry: false,
    mutationFn: async (request: ImportRequest) => {
      if (!isCurrent(request)) throw new CancelledError();
      const size = payloadSize(request.payload);
      if (size.content > MAX_IMPORT_BYTES || size.request > MAX_IMPORT_BYTES)
        throw new ApiError(
          "Общий размер файлов и запроса превышает 8 МиБ.",
          413,
        );
      if (
        !request.payload.employees_json.trim() &&
        !request.payload.history_csv.trim()
      )
        throw new ApiError("Выберите хотя бы один непустой файл.", 400);
      const result = await dataImportApi.importData(request.payload);
      if (!isCurrent(request)) throw new CancelledError();
      return result;
    },
    onSuccess: async (_result, request) => {
      if (!isCurrent(request)) return;
      // Reads begun before the import response must not restore the old dataset.
      await queryClient.cancelQueries({ predicate: affected });
      if (!isCurrent(request)) return;
      // Global refetchOnMount is false. Discard inactive snapshots so reopening a
      // previously visited employee cannot display the pre-import profile.
      queryClient.removeQueries({
        predicate: (query) => affected(query) && !query.isActive(),
      });
      // Active screens refresh independently; slow AI must not delay success.
      void queryClient
        .invalidateQueries({ predicate: affected })
        .catch(() => undefined);
    },
  });

  return {
    data: mutation.data,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
    canImport: session.data?.role === "hr",
    mutate: (payload: ImportPayload) => {
      if (session.data?.role !== "hr" || mutation.isPending) return;
      mutation.mutate({
        payload,
        sessionQuery: currentSessionQuery(),
        username: session.data.username,
      });
    },
  };
}
