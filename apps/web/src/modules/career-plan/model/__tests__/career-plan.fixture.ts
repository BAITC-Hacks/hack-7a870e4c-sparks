import type { CareerPlanDto } from "../../api/career-plan.api";

export function planFixture(
  overrides: Partial<CareerPlanDto> = {},
): CareerPlanDto {
  return {
    employee_id: "employee-test",
    current_position: { role: "Developer", grade: "Middle" },
    career_goal: { target_role: "Developer", target_grade: "Senior" },
    goal_source: "next_grade",
    as_of_date: "2026-10-01",
    last_review_date: "2026-08-01",
    effective_skills: { TYPESCRIPT: 2 },
    counted_completions: ["completion-42"],
    assessment_note: "Учитываются только завершения после оценки.",
    readiness: 50,
    projected_readiness: 75,
    projected_skills: { TYPESCRIPT: 3 },
    trajectory: [
      { event_id: "event-test", readiness_before: 50, readiness_after: 75 },
    ],
    gaps: [
      {
        skill_id: "TYPESCRIPT",
        name: "TypeScript",
        current: 2,
        required: 4,
        gap: 2,
        critical: true,
        covered: true,
      },
    ],
    recommendations: [
      {
        event: {
          event_id: "event-test",
          title: "Практика TypeScript",
          description: "Практическое обучение",
          type: "course",
          format: "self_paced",
          duration_hours: 4,
          mandatory: false,
          target_roles: ["Developer"],
          target_grades: ["Middle"],
          develops_skills: [{ skill_id: "TYPESCRIPT", gain: 1, max_level: 4 }],
          prerequisites: {},
          upcoming_sessions: [],
        },
        score: 5,
        factors: [
          { id: "grade", category: "grade", text: "Для Middle" },
          { id: "gap", category: "gap", text: "Развивает TypeScript" },
          { id: "target", category: "target", text: "Помогает цели Senior" },
        ],
        next_session: null,
        gains: [
          {
            skill_id: "TYPESCRIPT",
            name: "TypeScript",
            before: 2,
            after: 3,
            target: 4,
          },
        ],
        in_progress: false,
        explanation: "Закрывает часть пробела до Senior.",
      },
    ],
    uncovered_skills: [],
    mandatory_tasks: [],
    warnings: [],
    ...overrides,
  };
}
