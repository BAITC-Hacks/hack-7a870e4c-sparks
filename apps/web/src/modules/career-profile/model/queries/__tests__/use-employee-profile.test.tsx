import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  careerProfileApi,
  type ProfileData,
} from "../../../api/career-profile.api";
import { profileKeys } from "../profile.keys";
import { useEmployeeProfile } from "../use-employee-profile";

vi.mock("../../../api/career-profile.api", () => ({
  careerProfileApi: { getProfile: vi.fn() },
}));

function createProfile(readiness: number): ProfileData {
  return {
    employee: {
      employee_id: "profile-freshness-test",
      full_name: "Synthetic Employee",
      department: "Engineering",
      role: "Developer",
      grade: "Junior",
      manager_id: null,
      hire_date: "2025-01-01",
      tenure_months: 21,
      work_format: "hybrid",
      preferred_language: "ru",
      career_goal: null,
      skills: {},
      last_review_date: "2026-09-01",
    },
    effective_skills: {},
    target: { target_role: "Developer", target_grade: "Middle" },
    target_source: "next_grade",
    readiness,
    gaps: [],
    history: [],
    warnings: [],
  };
}

describe("employee profile freshness", () => {
  let queryClient: QueryClient;
  const employeeId = "profile-freshness-test";

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          retry: false,
          gcTime: Infinity,
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  function mountProfile(options?: { refetchOnMount?: boolean }) {
    return renderHook(() => useEmployeeProfile(employeeId, options), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
  }

  it("reloads the server profile when HR closes and reopens the same selection", async () => {
    const before = createProfile(40);
    const after = createProfile(80);
    vi.mocked(careerProfileApi.getProfile)
      .mockResolvedValueOnce(before)
      .mockResolvedValueOnce(after);
    const first = mountProfile({ refetchOnMount: true });
    await waitFor(() => expect(first.result.current.data).toEqual(before));
    first.unmount();

    const reopened = mountProfile({ refetchOnMount: true });
    await waitFor(() => expect(reopened.result.current.data).toEqual(after));

    expect(careerProfileApi.getProfile).toHaveBeenCalledTimes(2);
    expect(careerProfileApi.getProfile).toHaveBeenLastCalledWith(employeeId);
    expect(queryClient.getQueryData(profileKeys.detail(employeeId))).toEqual(
      after,
    );
  });

  it("preserves the configured employee default without an extra request on remount", async () => {
    const before = createProfile(40);
    vi.mocked(careerProfileApi.getProfile).mockResolvedValueOnce(before);
    const first = mountProfile();
    await waitFor(() => expect(first.result.current.data).toEqual(before));
    first.unmount();

    // An omitted option must inherit the global false, not override it with undefined.
    const reopened = mountProfile();
    expect(reopened.result.current.data).toEqual(before);
    expect(reopened.result.current.isFetching).toBe(false);
    expect(careerProfileApi.getProfile).toHaveBeenCalledTimes(1);
  });
});
