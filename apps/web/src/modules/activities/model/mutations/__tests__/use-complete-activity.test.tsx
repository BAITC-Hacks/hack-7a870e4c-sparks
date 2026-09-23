import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { profileKeys } from "@/modules/career-profile";

import { activitiesApi } from "../../../api/activities.api";
import { createProfile } from "../../__tests__/completion.fixtures";
import { mapCompletionToView } from "../../mappers/completion.mapper";
import { useCompleteActivity } from "../use-complete-activity";

vi.mock("../../../api/activities.api", () => ({
  activitiesApi: { completeActivity: vi.fn() },
}));

// The profile public API also exports UI; this hook does not use navigation.
vi.mock("@i18/navigation", () => ({}));

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useCompleteActivity", () => {
  const employeeId = "employee-test";
  const queryKey = profileKeys.detail(employeeId);
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: 3 },
      },
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  function renderMutation() {
    return renderHook(() => useCompleteActivity(employeeId), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
  }

  it("keeps skills unchanged while pending, then installs the exact server profile", async () => {
    const before = createProfile();
    const profile = createProfile({
      readiness: 100,
      effective_skills: { SK_TEST: 2 },
      gaps: [],
    });
    const response = { profile, already_completed: false };
    const request = deferred<typeof response>();
    queryClient.setQueryData(queryKey, before);
    vi.mocked(activitiesApi.completeActivity).mockReturnValueOnce(
      request.promise,
    );
    const { result } = renderMutation();

    act(() => result.current.mutate("event-test"));
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(queryClient.getQueryData(queryKey)).toEqual(before);
    expect(result.current.completion).toBeUndefined();

    await act(async () => request.resolve(response));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.completion?.before).toEqual(before);
    expect(result.current.data).toEqual({ ...response, before });
    expect(queryClient.getQueryData(queryKey)).toEqual(profile);
    expect(queryClient.getQueryData(queryKey)).toHaveProperty(
      "history",
      before.history,
    );
    expect(activitiesApi.completeActivity).toHaveBeenCalledExactlyOnceWith(
      employeeId,
      "event-test",
    );
  });

  it("invalidates all employee recommendation variants, plan and advisor only for that employee", async () => {
    const affected = [
      ["recommendations", employeeId],
      ["recommendations", employeeId, "rules"],
      ["career-plan", employeeId],
      ["career-advisor", employeeId],
    ];
    const otherEmployee = ["recommendations", "another-employee"];
    for (const key of [...affected, otherEmployee]) {
      queryClient.setQueryData(key, { cached: true });
    }
    vi.mocked(activitiesApi.completeActivity).mockResolvedValueOnce({
      profile: createProfile(),
      already_completed: false,
    });
    const { result } = renderMutation();

    await act(async () => result.current.mutateAsync("event-test"));
    for (const key of affected) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(queryClient.getQueryState(otherEmployee)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(false);
  });

  it("repeats the request without applying the completed gain or history a second time", async () => {
    const before = createProfile();
    const profile = createProfile({
      readiness: 100,
      effective_skills: { SK_TEST: 2 },
      gaps: [],
      history: [
        ...before.history,
        {
          ...before.history[0],
          record_id: "completed-record",
          event_id: "event-test",
          date: "2026-10-01",
          title: "Voluntary activity",
          mandatory: false,
          assigned_by: "self",
        },
      ],
    });
    queryClient.setQueryData(queryKey, before);
    vi.mocked(activitiesApi.completeActivity)
      .mockResolvedValueOnce({ profile, already_completed: false })
      .mockResolvedValueOnce({ profile, already_completed: true });
    const { result } = renderMutation();

    await act(async () => result.current.mutateAsync("event-test"));
    await act(async () => result.current.mutateAsync("event-test"));
    await waitFor(() =>
      expect(result.current.completion?.already_completed).toBe(true),
    );
    const completion = result.current.completion;
    expect(completion).toBeDefined();
    if (!completion) throw new Error("Expected successful completion");
    expect(completion.before).toEqual(profile);
    expect(mapCompletionToView(completion, "2026-10-01").changedSkills).toEqual(
      [],
    );
    expect(queryClient.getQueryData(queryKey)).toEqual(profile);
    expect(activitiesApi.completeActivity).toHaveBeenCalledTimes(2);
  });

  it("shows completion while a slow active recommendation refresh is still pending", async () => {
    const recommendationKey = ["recommendations", employeeId];
    const refresh = deferred<{ refreshed: boolean }>();
    const queryFn = vi.fn(() => refresh.promise);
    queryClient.setQueryData(recommendationKey, { refreshed: false });
    const observer = new QueryObserver(queryClient, {
      queryKey: recommendationKey,
      queryFn,
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    vi.mocked(activitiesApi.completeActivity).mockResolvedValueOnce({
      profile: createProfile(),
      already_completed: false,
    });
    const { result } = renderMutation();

    await act(async () => result.current.mutateAsync("event-test"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(recommendationKey)?.fetchStatus).toBe(
      "fetching",
    );
    expect(result.current.completion).toBeDefined();
    unsubscribe();
  });

  it("preserves the profile on error and disables retries despite global defaults", async () => {
    const before = createProfile();
    const error = new Error("Activity is no longer eligible");
    queryClient.setQueryData(queryKey, before);
    vi.mocked(activitiesApi.completeActivity).mockRejectedValue(error);
    const { result } = renderMutation();

    await act(async () => {
      await expect(result.current.mutateAsync("event-test")).rejects.toBe(
        error,
      );
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.completion).toBeUndefined();
    expect(queryClient.getQueryData(queryKey)).toEqual(before);
    expect(activitiesApi.completeActivity).toHaveBeenCalledTimes(1);
  });

  it("serializes completions across hook instances and snapshots the preceding response", async () => {
    const before = createProfile();
    const afterFirst = createProfile({
      effective_skills: { SK_TEST: 2 },
      readiness: 70,
    });
    const afterSecond = createProfile({
      effective_skills: { SK_TEST: 3 },
      readiness: 100,
    });
    const firstRequest = deferred<{
      profile: typeof before;
      already_completed: boolean;
    }>();
    const secondRequest = deferred<{
      profile: typeof before;
      already_completed: boolean;
    }>();
    queryClient.setQueryData(queryKey, before);
    vi.mocked(activitiesApi.completeActivity)
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const first = renderMutation();
    const second = renderMutation();

    act(() => {
      first.result.current.mutate("event-first");
      second.result.current.mutate("event-second");
    });
    await waitFor(() => expect(second.result.current.isPaused).toBe(true));
    expect(activitiesApi.completeActivity).toHaveBeenCalledExactlyOnceWith(
      employeeId,
      "event-first",
    );

    await act(async () =>
      firstRequest.resolve({ profile: afterFirst, already_completed: false }),
    );
    await waitFor(() =>
      expect(activitiesApi.completeActivity).toHaveBeenCalledTimes(2),
    );
    expect(queryClient.getQueryData(queryKey)).toEqual(afterFirst);
    await act(async () =>
      secondRequest.resolve({ profile: afterSecond, already_completed: false }),
    );
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(first.result.current.completion?.before).toEqual(before);
    expect(second.result.current.completion?.before).toEqual(afterFirst);
    expect(queryClient.getQueryData(queryKey)).toEqual(afterSecond);
  });

  it.each([true, false])(
    "does not repopulate a cleared cache after logout (initial profile: %s)",
    async (hasInitialProfile) => {
      const profile = createProfile();
      const response = { profile, already_completed: false };
      const request = deferred<typeof response>();
      if (hasInitialProfile) queryClient.setQueryData(queryKey, profile);
      vi.mocked(activitiesApi.completeActivity).mockReturnValueOnce(
        request.promise,
      );
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderMutation();

      act(() => result.current.mutate("event-test"));
      await waitFor(() =>
        expect(activitiesApi.completeActivity).toHaveBeenCalled(),
      );
      act(() => queryClient.clear());
      await act(async () => request.resolve(response));
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(queryClient.getQueryData(queryKey)).toBeUndefined();
      expect(result.current.completion).toBeUndefined();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it("keeps a replacement profile query when a response from the previous query arrives", async () => {
    const before = createProfile();
    const replacement = createProfile({ readiness: 90 });
    const request = deferred<{
      profile: typeof before;
      already_completed: boolean;
    }>();
    queryClient.setQueryData(queryKey, before);
    vi.mocked(activitiesApi.completeActivity).mockReturnValueOnce(
      request.promise,
    );
    const { result } = renderMutation();

    act(() => result.current.mutate("event-test"));
    await waitFor(() =>
      expect(activitiesApi.completeActivity).toHaveBeenCalled(),
    );
    act(() => {
      queryClient.removeQueries({ queryKey, exact: true });
      queryClient.setQueryData(queryKey, replacement);
    });
    await act(async () =>
      request.resolve({
        profile: createProfile({ readiness: 70 }),
        already_completed: false,
      }),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(queryKey)).toEqual(replacement);
    expect(result.current.completion).toBeUndefined();
  });

  it("does not send a queued completion after the client was cleared, even if resumed", async () => {
    const profile = createProfile();
    const request = deferred<{
      profile: typeof profile;
      already_completed: boolean;
    }>();
    queryClient.setQueryData(queryKey, profile);
    vi.mocked(activitiesApi.completeActivity).mockReturnValueOnce(
      request.promise,
    );
    const first = renderMutation();
    const second = renderMutation();

    act(() => {
      first.result.current.mutate("event-first");
      second.result.current.mutate("event-queued");
    });
    await waitFor(() => expect(second.result.current.isPaused).toBe(true));
    const queued = queryClient
      .getMutationCache()
      .getAll()
      .find((item) => item.state.isPaused);
    if (!queued) throw new Error("Expected queued completion");
    act(() => queryClient.clear());
    await act(async () => {
      await expect(queued.continue()).rejects.toBeInstanceOf(Error);
      request.resolve({ profile, already_completed: false });
    });
    await waitFor(() => expect(first.result.current.isError).toBe(true));

    expect(activitiesApi.completeActivity).toHaveBeenCalledExactlyOnceWith(
      employeeId,
      "event-first",
    );
    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
    expect(second.result.current.completion).toBeUndefined();
  });

  it.each(["before", "during"] as const)(
    "prevents a stale GET started %s the mutation from overwriting the response",
    async (timing) => {
      const before = createProfile();
      const profile = createProfile({
        readiness: 100,
        effective_skills: { SK_TEST: 2 },
      });
      const response = { profile, already_completed: false };
      const request = deferred<typeof response>();
      const staleRead = deferred<typeof profile>();
      queryClient.setQueryData(queryKey, before);
      vi.mocked(activitiesApi.completeActivity).mockReturnValueOnce(
        request.promise,
      );
      const { result } = renderMutation();
      const startRead = () =>
        queryClient
          .fetchQuery({ queryKey, queryFn: () => staleRead.promise })
          .catch(() => undefined);
      const earlyRead = timing === "before" ? startRead() : undefined;

      act(() => result.current.mutate("event-test"));
      await waitFor(() =>
        expect(activitiesApi.completeActivity).toHaveBeenCalled(),
      );
      const lateRead = timing === "during" ? startRead() : undefined;
      await act(async () => request.resolve(response));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await act(async () => {
        staleRead.resolve(before);
        await Promise.all([earlyRead, lateRead]);
      });

      expect(queryClient.getQueryData(queryKey)).toEqual(profile);
      expect(result.current.completion?.before).toEqual(before);
    },
  );
});
