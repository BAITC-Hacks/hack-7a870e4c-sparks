import { describe, expect, it } from "vitest";

import { createProfile } from "../../__tests__/completion.fixtures";
import { mapCompletionToView } from "../completion.mapper";

describe("completion result mapper", () => {
  it("compares effective skills and backend readiness, preserving server date", () => {
    const before = createProfile();
    const profile = createProfile({
      effective_skills: { SK_TEST: 2 },
      readiness: 87.4,
      gaps: [],
    });

    expect(
      mapCompletionToView(
        { before, profile, already_completed: false },
        "2026-10-01",
      ),
    ).toEqual({
      alreadyCompleted: false,
      comparisonAvailable: true,
      readinessBefore: 50,
      readinessAfter: 87.4,
      changedSkills: [
        { id: "SK_TEST", name: "Test skill", before: 1, after: 2 },
      ],
      closedGaps: [{ id: "SK_TEST", name: "Test skill" }],
      asOfDate: "2026-10-01",
    });
  });

  it("does not replay gains for an idempotent completion", () => {
    const result = mapCompletionToView(
      {
        before: createProfile(),
        profile: createProfile({ effective_skills: { SK_TEST: 2 }, gaps: [] }),
        already_completed: true,
      },
      "2026-10-01",
    );
    expect(result.changedSkills).toEqual([]);
    expect(result.closedGaps).toEqual([]);
    expect(result.alreadyCompleted).toBe(true);
  });

  it("preserves null readiness and does not invent a missing before snapshot", () => {
    const result = mapCompletionToView(
      {
        before: undefined,
        profile: createProfile({ readiness: null }),
        already_completed: false,
      },
      "2026-10-01",
    );
    expect(result.comparisonAvailable).toBe(false);
    expect(result.readinessBefore).toBeNull();
    expect(result.readinessAfter).toBeNull();
    expect(result.changedSkills).toEqual([]);
    expect(result.closedGaps).toEqual([]);
  });

  it("ignores malformed skill values and uses zero only for an absent skill", () => {
    const result = mapCompletionToView(
      {
        before: createProfile({
          effective_skills: {
            invalidString: "1",
            invalidNull: null,
            invalidNumber: Number.NaN,
            invalidFraction: 1.5,
            invalidRange: 6,
          },
        }),
        profile: createProfile({
          effective_skills: {
            invalidString: 2,
            invalidNull: 2,
            invalidNumber: 2,
            invalidFraction: 2,
            invalidRange: 2,
            newSkill: 1,
          },
        }),
        already_completed: false,
      },
      "2026-10-01",
    );
    expect(result.changedSkills).toEqual([
      { id: "newSkill", name: "newSkill", before: 0, after: 1 },
    ]);
  });

  it("does not turn a goal change or missing gap data into a closed gap", () => {
    const before = createProfile();
    const changedTarget = createProfile({
      target: { target_role: "Developer", target_grade: "Senior" },
      effective_skills: { SK_TEST: 2 },
      gaps: [],
    });
    const missingGap = createProfile({ gaps: [] });
    for (const profile of [changedTarget, missingGap]) {
      expect(
        mapCompletionToView(
          { before, profile, already_completed: false },
          "2026-10-01",
        ).closedGaps,
      ).toEqual([]);
    }
  });

  it("does not compare snapshots belonging to different employees", () => {
    const before = createProfile();
    const profile = createProfile({
      employee: { ...before.employee, employee_id: "another-employee" },
    });
    expect(
      mapCompletionToView(
        { before, profile, already_completed: false },
        "2026-10-01",
      ).comparisonAvailable,
    ).toBe(false);
  });
});
