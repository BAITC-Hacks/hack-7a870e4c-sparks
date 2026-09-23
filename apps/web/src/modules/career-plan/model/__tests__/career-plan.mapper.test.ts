import { describe, expect, it } from "vitest";

import { mapCareerPlan } from "../mappers/career-plan.mapper";
import { planFixture } from "./career-plan.fixture";

describe("mapCareerPlan", () => {
  it("keeps current and projected values separate without applying completions again", () => {
    const view = mapCareerPlan(planFixture());
    expect(view.skills[0]).toMatchObject({
      current: 2,
      projected: 3,
      required: 4,
    });
    expect(view.readiness).toBe(50);
    expect(view.projected_readiness).toBe(75);
    expect(view.counted_completions).toEqual(["completion-42"]);
    expect(view).not.toHaveProperty("history");
  });

  it("validates skill maps, uses zero for missing skills, and never fabricates a forecast", () => {
    const view = mapCareerPlan(
      planFixture({
        effective_skills: { TYPESCRIPT: "2", INVALID: 6, NAN: Number.NaN },
        projected_skills: {},
        uncovered_skills: ["SK_TEST_DESIGN"],
      }),
    );
    expect(
      view.skills.find((skill) => skill.id === "TYPESCRIPT"),
    ).toMatchObject({ current: null, projected: null });
    expect(
      view.skills.find((skill) => skill.id === "INVALID")?.current,
    ).toBeNull();
    expect(view.skills.find((skill) => skill.id === "NAN")?.current).toBeNull();
    expect(
      view.skills.find((skill) => skill.id === "SK_TEST_DESIGN"),
    ).toMatchObject({ current: 0, projected: null });
    expect(view.uncoveredSkills).toEqual([
      { id: "SK_TEST_DESIGN", name: "SK_TEST_DESIGN" },
    ]);
    expect(view.invalidSkillData).toBe(true);
  });

  it("preserves null readiness for Lead without a goal", () => {
    const view = mapCareerPlan(
      planFixture({
        current_position: { role: "Developer", grade: "Lead" },
        career_goal: null,
        goal_source: "none",
        readiness: null,
        projected_readiness: null,
        trajectory: [],
        recommendations: [],
      }),
    );
    expect(view.readiness).toBeNull();
    expect(view.projected_readiness).toBeNull();
    expect(view.trajectory).toEqual([]);
  });

  it("uses the selected target role's catalog requirements and validates their levels", () => {
    const view = mapCareerPlan(planFixture({ gaps: [] }), {
      as_of_date: "2026-10-01",
      roles: [
        {
          role: "Developer",
          grade: "Middle",
          required_skills: { TYPESCRIPT: 1 },
          critical_skills: [],
        },
        {
          role: "Developer",
          grade: "Senior",
          required_skills: { TYPESCRIPT: 4, COLLABORATION: "3" },
          critical_skills: [],
        },
      ],
      skills: [
        {
          skill_id: "COLLABORATION",
          name: "Сотрудничество",
          category: "communication",
          type: "soft",
          description: "Работа в команде",
        },
      ],
    });
    expect(
      view.skills.find((skill) => skill.id === "TYPESCRIPT"),
    ).toMatchObject({
      required: 4,
    });
    expect(
      view.skills.find((skill) => skill.id === "COLLABORATION"),
    ).toMatchObject({
      name: "Сотрудничество",
      current: 0,
      required: null,
    });
    expect(view.invalidSkillData).toBe(true);
  });

  it("excludes mandatory activities from suggested trajectories and recommendations", () => {
    const fixture = planFixture();
    fixture.recommendations[0].event.mandatory = true;
    const view = mapCareerPlan(fixture);
    expect(view.recommendations).toEqual([]);
    expect(view.trajectory).toEqual([]);
  });

  it("limits the plan to three recommendations and trajectory steps", () => {
    const fixture = planFixture();
    fixture.recommendations = Array.from({ length: 4 }, (_, index) => ({
      ...fixture.recommendations[0],
      event: {
        ...fixture.recommendations[0].event,
        event_id: `event-${index}`,
      },
    }));
    fixture.trajectory = fixture.recommendations.map((item) => ({
      event_id: item.event.event_id,
      readiness_before: 50,
      readiness_after: 75,
    }));
    const view = mapCareerPlan(fixture);
    expect(view.recommendations).toHaveLength(3);
    expect(view.trajectory).toHaveLength(3);
  });
});
