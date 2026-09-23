import { describe, expect, it, vi } from "vitest";

import { createProfile } from "../../model/__tests__/completion.fixtures";
import { activitiesApi } from "../activities.api";

const { completeActivity } = vi.hoisted(() => ({ completeActivity: vi.fn() }));

vi.mock("@/shared/api/generated", () => ({
  getCareerQuestAPI: () => ({ completeActivity }),
}));

describe("activities API adapter", () => {
  it("sends IDs and an empty body through the generated client", async () => {
    const response = { profile: createProfile(), already_completed: false };
    completeActivity.mockResolvedValueOnce(response);

    await expect(
      activitiesApi.completeActivity("employee-test", "event-test"),
    ).resolves.toBe(response);
    expect(completeActivity).toHaveBeenCalledExactlyOnceWith(
      "employee-test",
      "event-test",
      {},
    );
  });
});
