"use client";

import {
  CancelledError,
  type Query,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { type ProfileData, profileKeys } from "@/modules/career-profile";

import { activitiesApi } from "../../api/activities.api";
import type { ActivityCompletion } from "../mappers/completion.mapper";

type CompletionRequest = {
  eventId: string;
  profileQuery: Query | undefined;
};

export function useCompleteActivity(employeeId: string) {
  const queryClient = useQueryClient();
  const queryKey = profileKeys.detail(employeeId);

  const currentProfileQuery = () =>
    queryClient.getQueryCache().find({ queryKey, exact: true });
  const createRequest = (eventId: string): CompletionRequest => ({
    eventId,
    profileQuery: currentProfileQuery(),
  });
  const isCurrentRequest = (request: CompletionRequest) =>
    // Clearing the client on logout also removes pending mutations. Unlike the
    // network request, this identity cannot survive clear, even without a profile.
    queryClient
      .getMutationCache()
      .getAll()
      .some((pending) => pending.state.variables === request) &&
    (!request.profileQuery || request.profileQuery === currentProfileQuery());

  const mutation = useMutation({
    scope: { id: `complete-activity:${employeeId}` },
    meta: { requiresSession: true },
    mutationFn: async (
      request: CompletionRequest,
    ): Promise<ActivityCompletion> => {
      if (!isCurrentRequest(request)) throw new CancelledError();
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrentRequest(request)) throw new CancelledError();
      // Scoped mutations wait before entering mutationFn. Capture the preceding
      // completion's confirmed profile here, not in the earlier onMutate phase.
      const before = queryClient.getQueryData<ProfileData>(queryKey);
      const response = await activitiesApi.completeActivity(
        employeeId,
        request.eventId,
      );
      if (!isCurrentRequest(request)) throw new CancelledError();
      return { ...response, before };
    },
    retry: false,
    onSuccess: async ({ profile }, request) => {
      if (!isCurrentRequest(request)) return;
      // A profile read may also have started while completion was in flight.
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrentRequest(request)) return;
      queryClient.setQueryData(queryKey, profile);
      // Completion is ready now; slow AI refreshes report their own query state.
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hr-overview"] }),
        queryClient.invalidateQueries({
          queryKey: ["recommendations", employeeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["career-plan", employeeId],
        }),
      ]).catch(() => undefined);
    },
  });

  const completion: ActivityCompletion | undefined = mutation.isSuccess
    ? mutation.data
    : undefined;

  return {
    ...mutation,
    variables: mutation.variables?.eventId,
    mutate: (eventId: string) => mutation.mutate(createRequest(eventId)),
    mutateAsync: (eventId: string) =>
      mutation.mutateAsync(createRequest(eventId)),
    completion,
  };
}
