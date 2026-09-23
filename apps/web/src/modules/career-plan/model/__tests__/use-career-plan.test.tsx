import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/lib/client/custom-instance";

import { careerPlanApi } from "../../api/career-plan.api";
import { useCareerPlan } from "../queries/use-career-plan";
import { planFixture } from "./career-plan.fixture";

vi.mock("../../api/career-plan.api", () => ({
  careerPlanApi: { getPlan: vi.fn() },
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useCareerPlan", () => {
  beforeEach(() => vi.resetAllMocks());

  it("waits for the employee session", () => {
    const { client, wrapper } = setup();
    renderHook(() => useCareerPlan(null), { wrapper });
    expect(careerPlanApi.getPlan).not.toHaveBeenCalled();
    expect(client.getQueryCache().getAll()[0]?.meta).toEqual({
      requiresSession: true,
    });
  });

  it("keeps the previous plan after a 503 and retries only explicitly", async () => {
    const fixture = planFixture();
    vi.mocked(careerPlanApi.getPlan)
      .mockResolvedValueOnce(fixture)
      .mockRejectedValue(new ApiError("Agent unavailable", 503));
    const { wrapper } = setup();
    const { result, rerender } = renderHook(
      () => useCareerPlan("employee-test"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    expect(careerPlanApi.getPlan).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toEqual(fixture);
    expect(careerPlanApi.getPlan).toHaveBeenCalledTimes(2);
  });

  it("isolates plan data by employee when a session changes", async () => {
    vi.mocked(careerPlanApi.getPlan)
      .mockResolvedValueOnce(planFixture())
      .mockImplementationOnce(() => new Promise(() => {}));
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ id }) => useCareerPlan(id), {
      wrapper,
      initialProps: { id: "first" },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ id: "second" });
    expect(result.current.data).toBeUndefined();
    expect(careerPlanApi.getPlan).toHaveBeenLastCalledWith("second");
  });
});
