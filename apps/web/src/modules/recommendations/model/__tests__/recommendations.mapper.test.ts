import { describe, expect, it } from "vitest";
import type {
  Recommendation,
  RecommendationCatalog,
  RecommendationProfile,
  RecommendationsResult,
} from "../../api/recommendations.api";
import {
  mapRecommendation,
  mapRecommendationViews,
} from "../mappers/recommendations.mapper";

const profile: RecommendationProfile = {
  employee: {
    employee_id: "arbitrary-employee",
    full_name: "Test",
    role: "Engineer",
    grade: "Middle",
    department: "IT",
    work_format: "remote",
    preferred_language: "ru",
    career_goal: null,
    skills: {},
    last_review_date: "2026-09-01",
    manager_id: null,
    hire_date: "2025-01-01",
    tenure_months: 21,
  },
  effective_skills: { SK: 2 },
  target: null,
  target_source: "none",
  readiness: null,
  gaps: [],
  history: [],
  warnings: [],
};
const catalog: RecommendationCatalog = {
  as_of_date: "2026-10-01",
  roles: [],
  skills: [],
};
const recommendation: Recommendation = {
  event: {
    event_id: "activity-any",
    title: "Design",
    description: "Design workshop",
    type: "course",
    format: "online",
    duration_hours: 4,
    mandatory: false,
    target_roles: ["Engineer"],
    target_grades: ["Middle"],
    develops_skills: [],
    prerequisites: { SK: 2 },
    upcoming_sessions: ["2026-10-02"],
  },
  score: 1,
  factors: [
    { id: "grade", category: "grade", text: "Current grade" },
    { id: "gap", category: "gap", text: "Gap" },
    { id: "history", category: "history", text: "History" },
  ],
  next_session: "2026-10-02",
  gains: [{ skill_id: "SK", name: "Skill", before: 2, after: 3, target: 4 }],
  in_progress: false,
  explanation: "Backend explanation",
};

describe("recommendation availability", () => {
  it("uses server gains and the calculation date, not today's date", () => {
    const mapped = mapRecommendation(recommendation, profile, catalog);
    expect(mapped.available).toBe(true);
    expect(mapped.gains).toEqual(recommendation.gains);
    expect(profile.effective_skills).toEqual({ SK: 2 });
  });
  it("validates unknown prerequisite values and missing skills", () => {
    const mapped = mapRecommendation(
      {
        ...recommendation,
        event: {
          ...recommendation.event,
          prerequisites: { UNKNOWN: 1, INVALID: "2" },
        },
      },
      profile,
      catalog,
    );
    expect(mapped.blockedReasons).toEqual(
      expect.arrayContaining(["prerequisites", "unverified"]),
    );
    expect(mapped.prerequisites[0].current).toBe(0);
    expect(mapped.prerequisites[1].required).toBeNull();
  });
  it("requires three distinct factor categories", () => {
    const mapped = mapRecommendation(
      { ...recommendation, factors: Array(3).fill(recommendation.factors[0]) },
      profile,
      catalog,
    );
    expect(mapped.blockedReasons).toContain("insufficientFactors");
  });
  it("blocks mandatory and mismatched audience", () => {
    const mapped = mapRecommendation(
      {
        ...recommendation,
        event: {
          ...recommendation.event,
          mandatory: true,
          target_grades: ["Senior"],
        },
      },
      profile,
      catalog,
    );
    expect(mapped.blockedReasons).toEqual(["mandatory", "audience"]);
  });
  it("requires a returned future session for scheduled activities", () => {
    expect(
      mapRecommendation(
        { ...recommendation, next_session: "2026-09-30" },
        profile,
        catalog,
      ).blockedReasons,
    ).toContain("noSession");
    expect(
      mapRecommendation(
        { ...recommendation, next_session: "2026-10-05" },
        profile,
        catalog,
      ).blockedReasons,
    ).toContain("noSession");
    expect(
      mapRecommendation(
        {
          ...recommendation,
          next_session: null,
          event: {
            ...recommendation.event,
            format: "self_paced",
            upcoming_sessions: [],
          },
        },
        profile,
        catalog,
      ).available,
    ).toBe(true);
  });
  it("excludes mandatory events and caps the result at three", () => {
    const response: RecommendationsResult = {
      mode: "rules",
      model: null,
      message: "rules",
      duration_ms: 1,
      generated_at: "2026-10-01T00:00:00Z",
      recommendations: [
        {
          ...recommendation,
          event: { ...recommendation.event, mandatory: true },
        },
        ...Array.from({ length: 4 }, (_, i) => ({
          ...recommendation,
          event: { ...recommendation.event, event_id: String(i) },
        })),
      ],
    };
    const mapped = mapRecommendationViews(response, profile, catalog);
    expect(mapped).toHaveLength(3);
    expect(mapped.every((item) => !item.event.mandatory)).toBe(true);
  });
});
