import type { ProfileData } from "@/modules/career-profile";

export function createProfile(
  overrides: Partial<ProfileData> = {},
): ProfileData {
  return {
    employee: {
      employee_id: "employee-test",
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
      skills: { SK_TEST: 1 },
      last_review_date: "2026-09-01",
    },
    effective_skills: { SK_TEST: 1 },
    target: { target_role: "Developer", target_grade: "Middle" },
    target_source: "next_grade",
    readiness: 50,
    gaps: [
      {
        skill_id: "SK_TEST",
        name: "Test skill",
        current: 1,
        required: 2,
        gap: 1,
        critical: true,
        covered: true,
      },
    ],
    history: [
      {
        record_id: "mandatory-record",
        employee_id: "employee-test",
        event_id: "mandatory-event",
        date: "2026-09-01",
        due_date: null,
        status: "completed",
        completion_pct: 100,
        score: null,
        feedback_rating: null,
        assigned_by: "hr",
        title: "Mandatory activity",
        mandatory: true,
      },
    ],
    warnings: [],
    ...overrides,
  };
}
