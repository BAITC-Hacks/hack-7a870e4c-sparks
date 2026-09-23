import { expect, type Page } from "@playwright/test";
import type {
  CompleteActivity200,
  GetCatalog200,
  GetProfile200,
  GetRecommendations200,
} from "../../src/shared/api/generated";

export const employeeId = "employee-e2e";
export const activityId = "activity-e2e";
export const activityTitle = "Практика аналитического мышления";
export const nextActivityTitle = "Следующий шаг: командная аналитика";
export const skillName = "Аналитическое мышление";
export const activityPath = `/ru/employee/activity/${activityId}`;

const skillId = "skill-e2e";
const target = { target_role: "Аналитик", target_grade: "Senior" as const };

const catalog: GetCatalog200 = {
  as_of_date: "2026-10-01",
  roles: [
    {
      role: target.target_role,
      grade: target.target_grade,
      required_skills: { [skillId]: 5 },
      critical_skills: [skillId],
    },
  ],
  skills: [
    {
      skill_id: skillId,
      name: skillName,
      type: "hard",
      category: "Аналитика",
      description: "Анализ данных и обоснование решений",
    },
  ],
};

export const initialProfile: GetProfile200 = {
  employee: {
    employee_id: employeeId,
    full_name: "Тестовый Сотрудник",
    department: "Аналитика",
    role: "Аналитик",
    grade: "Middle",
    manager_id: null,
    hire_date: "2024-01-01",
    tenure_months: 33,
    work_format: "hybrid",
    preferred_language: "ru",
    career_goal: target,
    skills: { [skillId]: 2 },
    last_review_date: "2026-09-20",
  },
  target,
  target_source: "explicit",
  readiness: 40,
  effective_skills: { [skillId]: 2 },
  gaps: [
    {
      skill_id: skillId,
      name: skillName,
      current: 2,
      required: 5,
      gap: 3,
      critical: true,
      covered: true,
    },
  ],
  history: [2025, 2026].map((year) => ({
    record_id: `mandatory-record-${year}`,
    employee_id: employeeId,
    event_id: "mandatory-annual-e2e",
    title: "Ежегодный обязательный курс",
    date: `${year}-09-01`,
    due_date: `${year}-09-30`,
    status: "completed",
    completion_pct: 100,
    score: 90,
    feedback_rating: null,
    assigned_by: "hr",
    mandatory: true,
  })),
  warnings: [],
};

export const completedProfile: GetProfile200 = {
  ...initialProfile,
  readiness: 60,
  effective_skills: { [skillId]: 3 },
  gaps: initialProfile.gaps.map((gap) => ({ ...gap, current: 3, gap: 2 })),
  history: [
    ...initialProfile.history,
    {
      record_id: "completion-record-e2e",
      employee_id: employeeId,
      event_id: activityId,
      title: activityTitle,
      date: catalog.as_of_date,
      due_date: null,
      completed_at: "2026-10-01T00:00:00.000Z",
      status: "completed",
      completion_pct: 100,
      score: null,
      feedback_rating: null,
      assigned_by: "self",
      mandatory: false,
    },
  ],
};

function recommendations(completed: boolean): GetRecommendations200 {
  return {
    mode: "rules",
    model: null,
    message: "Рекомендация рассчитана по профилю и требованиям цели.",
    generated_at: "2026-10-01T00:00:00.000Z",
    duration_ms: 1,
    recommendations: [
      {
        event: {
          event_id: completed ? "next-activity-e2e" : activityId,
          title: completed ? nextActivityTitle : activityTitle,
          description: "Практикум по анализу данных и принятию решений.",
          type: "workshop",
          format: "online",
          duration_hours: 2,
          mandatory: false,
          target_roles: ["Аналитик"],
          target_grades: ["Middle"],
          develops_skills: [{ skill_id: skillId, gain: 2, max_level: 5 }],
          prerequisites: { [skillId]: 1 },
          upcoming_sessions: ["2026-10-02"],
        },
        score: 10,
        factors: [
          { id: "gap", category: "gap", text: "Закрывает разрыв навыка." },
          { id: "grade", category: "grade", text: "Подходит грейду Middle." },
          {
            id: "target",
            category: "target",
            text: "Соответствует цели Senior.",
          },
        ],
        next_session: "2026-10-02",
        // The forecast intentionally differs from the confirmed server result.
        gains: [
          {
            skill_id: skillId,
            name: skillName,
            before: completed ? 3 : 2,
            after: 4,
            target: 5,
          },
        ],
        in_progress: false,
        explanation: "Развивает навык, необходимый для выбранной цели.",
      },
    ],
  };
}

type CompletionReply = {
  status: number;
  json: CompleteActivity200 | { message: string };
};

export async function mockCompletionApi(
  page: Page,
  options: {
    completed?: boolean;
    emptyRecommendations?: boolean;
    mandatory?: boolean;
    reply?: (attempt: number) => Promise<CompletionReply>;
  } = {},
) {
  const state = {
    profile: options.completed ? completedProfile : initialProfile,
    authenticated: true,
    completionRequests: 0,
    recommendationRequests: 0,
    unexpectedRequests: [] as string[],
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/auth/session") {
      await route.fulfill({
        status: state.authenticated ? 200 : 401,
        json: state.authenticated
          ? {
              username: "employee-e2e",
              role: "employee",
              employee_id: employeeId,
              full_name: initialProfile.employee.full_name,
            }
          : { message: "Сессия истекла" },
      });
      return;
    }
    if (path === "/api/catalog") {
      expect(request.method()).toBe("GET");
      await route.fulfill({ json: catalog });
      return;
    }
    if (path === `/api/employees/${employeeId}`) {
      expect(request.method()).toBe("GET");
      await route.fulfill({ json: state.profile });
      return;
    }
    if (path === `/api/employees/${employeeId}/recommendations`) {
      expect(request.method()).toBe("POST");
      expect(request.postDataJSON()).toEqual({});
      state.recommendationRequests += 1;
      const response = recommendations(state.profile === completedProfile);
      if (options.emptyRecommendations) {
        response.recommendations = [];
        response.message = "Подходящих добровольных активностей нет.";
      }
      if (options.mandatory) {
        for (const item of response.recommendations)
          item.event.mandatory = true;
      }
      await route.fulfill({ json: response });
      return;
    }
    if (
      path === `/api/employees/${employeeId}/activities/${activityId}/complete`
    ) {
      expect(request.method()).toBe("POST");
      expect(request.postDataJSON()).toEqual({});
      state.completionRequests += 1;
      const reply = options.reply
        ? await options.reply(state.completionRequests)
        : {
            status: 200,
            json: { profile: completedProfile, already_completed: false },
          };
      if ("profile" in reply.json) state.profile = reply.json.profile;
      if (reply.status === 401) state.authenticated = false;
      await route.fulfill(reply);
      return;
    }

    state.unexpectedRequests.push(`${request.method()} ${path}`);
    await route.fulfill({
      status: 404,
      json: { message: "Unexpected API call" },
    });
  });

  return state;
}
