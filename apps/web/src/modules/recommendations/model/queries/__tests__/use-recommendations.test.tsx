import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/lib/client/custom-instance";

import type { RecommendationsResponse } from "../../../api/recommendations.api";
import { mapRecommendations } from "../../mappers/recommendations.mapper";
import { recommendationsKeys } from "../recommendations.keys";
import { useRecommendations } from "../use-recommendations";

const { getRecommendations } = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
}));

vi.mock("@/shared/api/generated", () => ({
  getCareerQuestAPI: () => ({ getRecommendations }),
}));

function response(): RecommendationsResponse {
  return {
    mode: "rules",
    model: null,
    message: "Рекомендации рассчитаны по правилам.",
    generated_at: "2026-10-01T12:00:00.000Z",
    duration_ms: 10,
    recommendations: [
      {
        event: {
          event_id: "event-1",
          title: "Развитие навыков",
          description: "Практический курс",
          type: "course",
          format: "self_paced",
          duration_hours: 2,
          mandatory: false,
          target_roles: ["Engineer"],
          target_grades: ["Junior"],
          develops_skills: [{ skill_id: "skill-1", gain: 1, max_level: 3 }],
          prerequisites: { "skill-1": 1 },
          upcoming_sessions: [],
        },
        score: 1,
        factors: [],
        next_session: null,
        gains: [
          {
            skill_id: "skill-1",
            name: "Навык",
            before: 1,
            after: 2,
            target: 3,
          },
        ],
        in_progress: false,
        explanation: "Закрывает дефицит навыка.",
      },
    ],
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return {
    queryClient,
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("useRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRecommendations.mockResolvedValue(response());
  });

  it("waits for the employee session and sends an explicit empty body once", async () => {
    const { wrapper } = createWrapper();
    const initialProps: { employeeId: string | null } = { employeeId: null };
    const { result, rerender } = renderHook(
      ({ employeeId }: { employeeId: string | null }) =>
        useRecommendations(employeeId),
      { wrapper, initialProps },
    );
    expect(getRecommendations).not.toHaveBeenCalled();

    rerender({ employeeId: "employee-1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getRecommendations).toHaveBeenCalledWith("employee-1", {});
    expect(result.current.data?.mode).toBe("rules");
    expect(result.current.data?.recommendations[0].event.prerequisites).toEqual(
      {
        "skill-1": 1,
      },
    );

    rerender({ employeeId: "employee-1" });
    expect(getRecommendations).toHaveBeenCalledTimes(1);
  });

  it("refetches the employee query after activity completion invalidates it", async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useRecommendations("employee-1"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.recommendations).toHaveLength(1);

    getRecommendations.mockResolvedValue({
      ...response(),
      recommendations: [],
      message: "Доступных следующих шагов нет.",
    });
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: recommendationsKeys.detail("employee-1"),
      });
    });

    expect(getRecommendations).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData(recommendationsKeys.detail("employee-1")),
    ).toMatchObject({ recommendations: [] });
    await waitFor(() =>
      expect(result.current.data?.recommendations).toEqual([]),
    );
    expect(result.current.data?.message).toBe("Доступных следующих шагов нет.");
  });

  it("exposes forbidden responses without retrying the POST", async () => {
    const { wrapper } = createWrapper();
    const error = new ApiError("Доступ запрещён", 403);
    getRecommendations.mockRejectedValue(error);
    const { result } = renderHook(() => useRecommendations("employee-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(getRecommendations).toHaveBeenCalledTimes(1);
  });
});

describe("recommendation prerequisites", () => {
  it.each(["2", null, Number.NaN, Number.POSITIVE_INFINITY, -1, 6, 1.5])(
    "rejects an invalid requirement %s instead of declaring an activity eligible",
    (level) => {
      const data = response();
      data.recommendations[0].event.prerequisites["skill-1"] = level;
      expect(() => mapRecommendations(data)).toThrow(
        "Не удалось проверить требования активности",
      );
    },
  );

  it("preserves valid zero and maximum requirements without mutating the response", () => {
    const data = response();
    data.recommendations[0].event.prerequisites = { basic: 0, advanced: 5 };
    const mapped = mapRecommendations(data);
    expect(mapped.recommendations[0].event.prerequisites).toEqual({
      basic: 0,
      advanced: 5,
    });
    expect(mapped.recommendations[0].event).not.toBe(
      data.recommendations[0].event,
    );
  });
});
