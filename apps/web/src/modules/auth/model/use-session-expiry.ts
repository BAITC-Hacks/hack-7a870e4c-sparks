"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";
import { sessionKeys } from "./queries/session.keys";

/** Only authenticated operations may expire a session; public API errors cannot. */
export function useSessionExpiry() {
  const client = useQueryClient();
  useEffect(() => {
    let expiring = false;
    function expire(error: unknown, requiresSession: unknown) {
      if (expiring || !requiresSession || getApiErrorStatus(error) !== 401)
        return;
      expiring = true;
      // Notify the mounted guard before removing protected cache entries.
      client.setQueryData(sessionKeys.current(), null);
      void client.cancelQueries().then(() => {
        client.removeQueries({
          predicate: (query) => query.queryKey[0] !== sessionKeys.all[0],
        });
        client.getMutationCache().clear();
      });
    }
    const unsubscribeQueries = client.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        expire(event.query.state.error, event.query.meta?.requiresSession);
      }
    });
    const unsubscribeMutations = client
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error") {
          expire(
            event.mutation.state.error,
            event.mutation.meta?.requiresSession,
          );
        }
      });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [client]);
}
