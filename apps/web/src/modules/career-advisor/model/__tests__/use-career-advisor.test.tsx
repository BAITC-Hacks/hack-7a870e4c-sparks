import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/lib/client/custom-instance";
import {
  type AdvisorResponse,
  careerAdvisorApi,
} from "../../api/career-advisor.api";
import { useCareerAdvisor } from "../mutations/use-career-advisor";
import { advisorFixture } from "./career-advisor.fixture";

vi.mock("../../api/career-advisor.api", () => ({
  careerAdvisorApi: { chat: vi.fn() },
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: 3 },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useCareerAdvisor", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);

  it("invalidates only this employee's plan and recommendations after success", async () => {
    const response = advisorFixture();
    vi.mocked(careerAdvisorApi.chat).mockResolvedValue(response);
    const { client, wrapper } = setup();
    for (const key of [
      ["career-plan", "employee-test"],
      ["recommendations", "employee-test"],
      ["career-plan", "other"],
      ["recommendations", "other"],
      ["employee-profile", "employee-test"],
    ])
      client.setQueryData(key, { existing: true });
    const { result } = renderHook(() => useCareerAdvisor("employee-test"), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ message: "Как развиваться?" });
    });

    await waitFor(() => expect(result.current.data).toBe(response));
    expect(
      client.getQueryState(["career-plan", "employee-test"])?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(["recommendations", "employee-test"])?.isInvalidated,
    ).toBe(true);
    expect(client.getQueryState(["career-plan", "other"])?.isInvalidated).toBe(
      false,
    );
    expect(
      client.getQueryState(["recommendations", "other"])?.isInvalidated,
    ).toBe(false);
    expect(
      client.getQueryState(["employee-profile", "employee-test"])
        ?.isInvalidated,
    ).toBe(false);
    expect(client.getQueryData(["career-plan", "employee-test"])).toEqual({
      existing: true,
    });
    expect(client.getMutationCache().getAll()[0]?.meta).toEqual({
      requiresSession: true,
    });
  });

  it.each([401, 503])(
    "does not retry a failed POST or invalidate cached state for %s",
    async (status) => {
      vi.mocked(careerAdvisorApi.chat).mockRejectedValue(
        new ApiError("Unavailable", status),
      );
      const { client, wrapper } = setup();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      const { result } = renderHook(() => useCareerAdvisor("employee-test"), {
        wrapper,
      });
      act(() => result.current.mutate({ message: "Как развиваться?" }));

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(careerAdvisorApi.chat).toHaveBeenCalledTimes(1);
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it("keeps the originating employee for invalidation if the session changes mid-request", async () => {
    let complete!: (response: AdvisorResponse) => void;
    vi.mocked(careerAdvisorApi.chat).mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result, rerender } = renderHook(({ id }) => useCareerAdvisor(id), {
      wrapper,
      initialProps: { id: "first" },
    });
    act(() => result.current.mutate({ message: "Как развиваться?" }));
    await waitFor(() =>
      expect(careerAdvisorApi.chat).toHaveBeenCalledWith("first", {
        message: "Как развиваться?",
      }),
    );
    rerender({ id: "second" });
    await act(async () => complete(advisorFixture()));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["career-plan", "first"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["recommendations", "first"],
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ["career-plan", "second"],
    });
  });
});
