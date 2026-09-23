import { describe, expect, it } from "vitest";

import { mapProfileToView } from "../profile.mapper";

type Profile = Parameters<typeof mapProfileToView>[0];
type Catalog = NonNullable<Parameters<typeof mapProfileToView>[1]>;

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    employee: {
      employee_id: "employee-profile-test",
      full_name: "Synthetic Profile",
      department: "Engineering",
      role: "Developer",
      grade: "Junior",
      manager_id: null,
      hire_date: "2025-01-01",
      tenure_months: 21,
      work_format: "hybrid",
      preferred_language: "ru",
      career_goal: null,
      skills: { SK_TEST: 1 },
      last_review_date: "2026-09-01",
    },
    effective_skills: { SK_TEST: 2 },
    target: { target_role: "Developer", target_grade: "Middle" },
    target_source: "next_grade",
    readiness: 66.7,
    gaps: [
      {
        skill_id: "SK_TEST",
        name: "Test skill",
        current: 2,
        required: 3,
        gap: 1,
        critical: true,
        covered: true,
      },
    ],
    history: [],
    warnings: [],
    ...overrides,
  };
}

function catalog(
  requirements: Record<string, unknown> = { SK_TEST: 3 },
): Catalog {
  return {
    as_of_date: "2026-10-01",
    roles: [
      {
        role: "Developer",
        grade: "Middle",
        required_skills: requirements,
        critical_skills: ["SK_TEST"],
      },
    ],
    skills: [
      {
        skill_id: "SK_TEST",
        name: "Test skill",
        type: "hard",
        category: "Engineering",
        description: "Synthetic test skill",
      },
    ],
  };
}

describe("profile mapper", () => {
  it("uses effective skills and exact backend readiness, gaps and target source", () => {
    const source = profile();
    const result = mapProfileToView(source, catalog());

    expect(result.skills).toEqual([
      {
        id: "SK_TEST",
        name: "Test skill",
        current: 2,
        required: 3,
        gap: 1,
        critical: true,
      },
    ]);
    expect(result.readiness).toBe(66.7);
    expect(result.targetSource).toBe("next_grade");
    expect(result.employee.skills).toEqual({ SK_TEST: 1 });
    expect(result.gaps).toBe(source.gaps);
  });

  it("includes skills required by the goal but absent from the profile at level zero", () => {
    const result = mapProfileToView(
      profile(),
      catalog({ SK_TEST: 3, SK_MISSING: 2 }),
    );

    expect(result.skills).toContainEqual({
      id: "SK_MISSING",
      name: "SK_MISSING",
      current: 0,
      required: 2,
      gap: null,
      critical: false,
    });
  });

  it.each(["3", null, Number.NaN, Number.POSITIVE_INFINITY, -1, 6, 1.5])(
    "does not expose an invalid level %s as a numeric skill or requirement",
    (invalidLevel) => {
      const result = mapProfileToView(
        profile({ effective_skills: { SK_INVALID: invalidLevel }, gaps: [] }),
        catalog({ SK_INVALID: invalidLevel }),
      );
      expect(result.skills).toEqual([
        {
          id: "SK_INVALID",
          name: "SK_INVALID",
          current: 0,
          required: null,
          gap: null,
          critical: false,
        },
      ]);
    },
  );

  it("preserves a missing goal and null readiness without assigning zero readiness or a new goal", () => {
    const result = mapProfileToView(
      profile({
        target: null,
        target_source: "none",
        readiness: null,
        gaps: [],
        warnings: ["An explicit goal is needed"],
      }),
      catalog(),
    );
    expect(result.target).toBeNull();
    expect(result.targetSource).toBe("none");
    expect(result.readiness).toBeNull();
    expect(result.skills[0].required).toBeNull();
    expect(result.warnings).toEqual(["An explicit goal is needed"]);
  });

  it("keeps repeated mandatory history rows and backend completion dates unchanged", () => {
    const baseRecord: Profile["history"][number] = {
      record_id: "annual-2025",
      employee_id: "employee-profile-test",
      event_id: "annual-compliance",
      date: "2025-09-01",
      due_date: null,
      status: "completed",
      completion_pct: 100,
      score: null,
      feedback_rating: null,
      assigned_by: "hr",
      title: "Annual compliance",
      mandatory: true,
    };
    const source = profile({
      history: [
        baseRecord,
        {
          ...baseRecord,
          record_id: "annual-2026",
          date: "2026-09-01",
          completed_at: "2026-09-15T12:00:00.000Z",
        },
      ],
    });
    const result = mapProfileToView(source, catalog());

    expect(result.history).toBe(source.history);
    expect(result.history).toHaveLength(2);
    expect(result.history[0]).not.toHaveProperty("completed_at");
    expect(result.history[1].completed_at).toBe("2026-09-15T12:00:00.000Z");
    expect(result.skills[0].current).toBe(2);
  });

  it("handles empty profile skills and absent catalog without invented requirements", () => {
    const result = mapProfileToView(
      profile({ effective_skills: {}, gaps: [] }),
      undefined,
    );
    expect(result.skills).toEqual([]);
    expect(result.readiness).toBe(66.7);
  });
});
