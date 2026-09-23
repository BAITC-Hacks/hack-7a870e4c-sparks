import type { ProfileData } from "@/modules/career-profile";

import type { Recommendation } from "../model/mappers/recommendations.mapper";

export type ActivityBlockingReason =
  | "mandatory"
  | "audience"
  | "prerequisites"
  | "session"
  | "completed";

/** Reflect known blockers; the completion endpoint remains the eligibility authority. */
export function getActivityAvailability(
  recommendation: Recommendation,
  profile: ProfileData,
  asOfDate: string,
): ActivityBlockingReason[] {
  const { event } = recommendation;
  const reasons: ActivityBlockingReason[] = [];

  if (event.mandatory) reasons.push("mandatory");
  if (
    !event.target_roles.includes(profile.employee.role) ||
    !event.target_grades.includes(profile.employee.grade)
  ) {
    reasons.push("audience");
  }
  if (
    Object.entries(event.prerequisites).some(([skillId, required]) => {
      const current = profile.effective_skills[skillId];
      if (current === undefined) return required > 0;
      return (
        typeof current !== "number" ||
        !Number.isFinite(current) ||
        current < required
      );
    })
  ) {
    reasons.push("prerequisites");
  }
  if (
    event.format !== "self_paced" &&
    !event.upcoming_sessions.some((date) => date >= asOfDate)
  ) {
    reasons.push("session");
  }
  if (
    profile.history.some(
      (record) =>
        record.event_id === event.event_id &&
        record.status === "completed" &&
        (event.event_id !== "EV_036" ||
          record.date === asOfDate ||
          record.completed_at?.slice(0, 10) === asOfDate),
    )
  ) {
    reasons.push("completed");
  }
  return reasons;
}
