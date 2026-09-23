import type { AdvisorResponse } from "../../api/career-advisor.api";

export function advisorFixture(
  reply = "Развивайте навыки для своей цели.",
): AdvisorResponse {
  return {
    employee_id: "employee-test",
    reply,
    plan: {
      employee_id: "employee-test",
      current_position: { role: "Developer", grade: "Middle" },
      career_goal: { target_role: "Developer", target_grade: "Senior" },
      goal_source: "explicit",
      as_of_date: "2026-10-01",
      last_review_date: "2026-08-01",
      effective_skills: { TYPESCRIPT: 2 },
      counted_completions: [],
      assessment_note: "Учитываются завершения после оценки.",
      readiness: 50,
      projected_readiness: 50,
      projected_skills: { TYPESCRIPT: 2 },
      trajectory: [],
      gaps: [],
      recommendations: [],
      uncovered_skills: [],
      mandatory_tasks: [],
      warnings: [],
    },
    recommendations: {
      mode: "rules",
      model: null,
      message: "Нет доступных рекомендаций.",
      recommendations: [],
      generated_at: "2026-10-01T12:00:00Z",
      duration_ms: 10,
    },
  };
}
