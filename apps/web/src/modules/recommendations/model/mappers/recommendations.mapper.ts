import type {
  Recommendation,
  RecommendationCatalog,
  RecommendationProfile,
  RecommendationsResult,
} from "../../api/recommendations.api";

export type BlockedReason =
  | "mandatory"
  | "audience"
  | "prerequisites"
  | "noSession"
  | "completed"
  | "unverified"
  | "insufficientFactors";

function skillLevel(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 5
    ? value
    : null;
}

export function mapRecommendation(
  recommendation: Recommendation,
  profile: RecommendationProfile,
  catalog: RecommendationCatalog,
) {
  const event = recommendation.event;
  const reasons = new Set<BlockedReason>();
  const prerequisites = Object.entries(event.prerequisites).map(
    ([id, value]) => {
      const required = skillLevel(value);
      const current = skillLevel(profile.effective_skills[id] ?? 0);
      if (required === null || current === null) reasons.add("unverified");
      else if (current < required) reasons.add("prerequisites");
      return {
        id,
        name: catalog.skills.find((skill) => skill.skill_id === id)?.name ?? id,
        current,
        required,
      };
    },
  );
  if (event.mandatory) reasons.add("mandatory");
  if (
    !event.target_roles.includes(profile.employee.role) ||
    !event.target_grades.includes(profile.employee.grade)
  ) {
    reasons.add("audience");
  }
  const completed = profile.history.some(
    (record) =>
      record.event_id === event.event_id &&
      record.status === "completed" &&
      (event.event_id !== "EV_036" ||
        (record.completed_at?.slice(0, 10) ?? record.date) ===
          catalog.as_of_date),
  );
  if (completed) reasons.add("completed");
  const nextSession = recommendation.next_session;
  if (
    event.format !== "self_paced" &&
    (!nextSession ||
      nextSession < catalog.as_of_date ||
      !event.upcoming_sessions.includes(nextSession))
  ) {
    reasons.add("noSession");
  }
  const factors = recommendation.factors.filter((factor) => factor.text.trim());
  if (new Set(factors.map((factor) => factor.category)).size < 3)
    reasons.add("insufficientFactors");

  return {
    ...recommendation,
    factors,
    prerequisites,
    blockedReasons: [...reasons],
    available: reasons.size === 0,
  };
}

export type RecommendationView = ReturnType<typeof mapRecommendation>;

export function mapRecommendations(
  response: RecommendationsResult,
  profile: RecommendationProfile,
  catalog: RecommendationCatalog,
) {
  return response.recommendations
    .filter((recommendation) => !recommendation.event.mandatory)
    .slice(0, 3)
    .map((recommendation) =>
      mapRecommendation(recommendation, profile, catalog),
    );
}
