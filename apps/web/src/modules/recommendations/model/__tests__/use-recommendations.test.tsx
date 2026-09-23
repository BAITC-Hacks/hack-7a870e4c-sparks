import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/client/custom-instance";
import { recommendationsApi } from "../../api/recommendations.api";
import { useRecommendations } from "../queries/use-recommendations";

vi.mock("../../api/recommendations.api", () => ({
  recommendationsApi: { getRecommendations: vi.fn() },
}));

function setup(employeeId: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 5 } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    client,
    ...renderHook(() => useRecommendations(employeeId), { wrapper }),
  };
}

describe("useRecommendations", () => {
  beforeEach(() => vi.clearAllMocks());
  it("does not call the API without an employee", () => {
    const hook = setup(null);
    expect(recommendationsApi.getRecommendations).not.toHaveBeenCalled();
    hook.unmount();
  });
  it("fetches once across rerenders and refreshes explicitly", async () => {
    vi.mocked(recommendationsApi.getRecommendations).mockResolvedValue({
      mode: "rules",
      model: null,
      message: "No steps",
      recommendations: [],
      generated_at: "2026-10-01T00:00:00Z",
      duration_ms: 1,
    });
    const hook = setup("imported-employee");
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    hook.rerender();
    expect(recommendationsApi.getRecommendations).toHaveBeenCalledTimes(1);
    expect(
      hook.client.getQueryData(["recommendations", "imported-employee"]),
    ).toMatchObject({ mode: "rules" });
    await act(async () => {
      await hook.result.current.refetch();
    });
    expect(recommendationsApi.getRecommendations).toHaveBeenCalledTimes(2);
    hook.unmount();
  });
  it("never automatically retries 401 or other POST errors", async () => {
    vi.mocked(recommendationsApi.getRecommendations).mockRejectedValue(
      new ApiError("Expired", 401),
    );
    const hook = setup("any-employee");
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(recommendationsApi.getRecommendations).toHaveBeenCalledTimes(1);
    hook.unmount();
  });
});
