import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/lib/client/custom-instance";

import type {
  EmployeeSummary,
  HrOverviewData,
} from "../../../api/hr-overview.api";
import { hrEmployeesKeys, hrOverviewKeys } from "../hr-overview.keys";
import { useHrEmployees } from "../use-hr-employees";
import { useHrOverview } from "../use-hr-overview";

const { getHrOverview, getEmployees } = vi.hoisted(() => ({
  getHrOverview: vi.fn(),
  getEmployees: vi.fn(),
}));

vi.mock("@/shared/api/generated", () => ({
  getCareerQuestAPI: () => ({ getHrOverview, getEmployees }),
}));

const overview: HrOverviewData = {
  total_employees: 37,
  employees_without_step: [
    {
      employee_id: "employee-1",
      full_name: "Сотрудник",
      role: "Engineer",
      reason: "Нет доступной сессии.",
    },
  ],
  skill_gaps: [
    { skill_id: "skill-1", name: "Навык", employees: 11, average_gap: 1.25 },
  ],
  participation: [
    {
      event_id: "event-1",
      title: "Мероприятие",
      mandatory: true,
      completed: 13,
      in_progress: 7,
      other: 9,
      total: 29,
    },
  ],
  as_of_date: "2026-10-01",
};

const employee: EmployeeSummary = {
  employee_id: "employee-1",
  full_name: "Сотрудник",
  role: "Engineer",
  grade: "Middle",
  department: "IT",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } },
  });
  return {
    queryClient,
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

function useHrQueries(enabled = true) {
  return {
    overview: useHrOverview(enabled),
    employees: useHrEmployees(enabled),
  };
}

describe("HR API queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHrOverview.mockResolvedValue(overview);
    getEmployees.mockResolvedValue({ employees: [employee] });
  });

  it("waits for role authorization before loading either protected dataset", async () => {
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ enabled }) => useHrQueries(enabled),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(getHrOverview).not.toHaveBeenCalled();
    expect(getEmployees).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.overview.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.employees.isSuccess).toBe(true));
    expect(getHrOverview).toHaveBeenCalledTimes(1);
    expect(getEmployees).toHaveBeenCalledTimes(1);
  });

  it("preserves server aggregates, reasons, mandatory history and the calculation date", async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useHrQueries(), { wrapper });
    await waitFor(() => expect(result.current.overview.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.employees.isSuccess).toBe(true));

    expect(result.current.overview.data).toEqual(overview);
    expect(result.current.employees.data).toEqual([employee]);
    expect(queryClient.getQueryData(hrOverviewKeys.all)).toEqual(overview);
    expect(queryClient.getQueryData(hrEmployeesKeys.all)).toEqual([employee]);
  });

  it("keeps empty arrays as valid successful results", async () => {
    const emptyOverview: HrOverviewData = {
      total_employees: 0,
      employees_without_step: [],
      skill_gaps: [],
      participation: [],
      as_of_date: "2026-10-01",
    };
    getHrOverview.mockResolvedValue(emptyOverview);
    getEmployees.mockResolvedValue({ employees: [] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHrQueries(), { wrapper });
    await waitFor(() => expect(result.current.overview.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.employees.isSuccess).toBe(true));

    expect(result.current.overview.data).toEqual(emptyOverview);
    expect(result.current.employees.data).toEqual([]);
  });

  it.each([401, 403])(
    "does not retry a %s response for either HR query",
    async (status) => {
      const error = new ApiError("Нет доступа", status);
      getHrOverview.mockRejectedValue(error);
      getEmployees.mockRejectedValue(error);
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useHrQueries(), { wrapper });

      await waitFor(() => expect(result.current.overview.isError).toBe(true));
      await waitFor(() => expect(result.current.employees.isError).toBe(true));
      expect(result.current.overview.error).toBe(error);
      expect(result.current.employees.error).toBe(error);
      expect(getHrOverview).toHaveBeenCalledTimes(1);
      expect(getEmployees).toHaveBeenCalledTimes(1);
    },
  );

  it("invalidates overview independently from the directory after a profile change", async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useHrQueries(), { wrapper });
    await waitFor(() => expect(result.current.overview.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.employees.isSuccess).toBe(true));
    expect(result.current.overview.data?.employees_without_step).toHaveLength(
      1,
    );

    getHrOverview.mockResolvedValue({
      ...overview,
      employees_without_step: [],
    });
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: hrOverviewKeys.all });
    });
    await waitFor(() =>
      expect(result.current.overview.data?.employees_without_step).toEqual([]),
    );
    expect(getHrOverview).toHaveBeenCalledTimes(2);
    expect(getEmployees).toHaveBeenCalledTimes(1);
  });

  it("limits a temporary server-error retry to one additional request", async () => {
    getHrOverview.mockRejectedValue(new ApiError("Сервис недоступен", 503));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHrOverview(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getHrOverview).toHaveBeenCalledTimes(2);
  });
});
