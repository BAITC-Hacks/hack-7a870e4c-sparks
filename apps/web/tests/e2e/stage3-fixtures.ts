import type { Page, Route } from "@playwright/test";
import type {
  ChatWithCareerAdvisor200,
  ChatWithCareerAdvisorBodyOne,
  GetCareerPlan200,
  GetCatalog200,
  GetProfile200,
  GetRecommendations200,
  GetSession200,
} from "../../src/shared/api/generated";

// Isolated HTTP responses for browser tests. These never enter application code.
export const employeeId = "E_SMOKE_731";
export const session: GetSession200 = {
  username: "stage3.employee",
  role: "employee",
  employee_id: employeeId,
  full_name: "Синтетический сотрудник для проверки",
};

export const profile: GetProfile200 = {
  employee: {
    employee_id: employeeId,
    full_name: session.full_name,
    department: "Тестовая аналитика",
    role: "Data Analyst",
    grade: "Junior",
    manager_id: null,
    hire_date: "2025-01-01",
    tenure_months: 21,
    work_format: "hybrid",
    preferred_language: "ru",
    career_goal: { target_role: "Data Analyst", target_grade: "Middle" },
    skills: { SK_SQL: 2, SK_TEST_DESIGN: 0 },
    last_review_date: "2026-09-01",
  },
  effective_skills: { SK_SQL: 2, SK_TEST_DESIGN: 0 },
  target: { target_role: "Data Analyst", target_grade: "Middle" },
  target_source: "explicit",
  readiness: 40,
  gaps: [
    {
      skill_id: "SK_SQL",
      name: "SQL",
      current: 2,
      required: 4,
      gap: 2,
      critical: true,
      covered: true,
    },
    {
      skill_id: "SK_TEST_DESIGN",
      name: "Проектирование тестов",
      current: 0,
      required: 1,
      gap: 1,
      critical: false,
      covered: false,
    },
  ],
  history: [],
  warnings: [],
};

export const catalog: GetCatalog200 = {
  as_of_date: "2026-10-01",
  roles: [
    {
      role: "Data Analyst",
      grade: "Middle",
      required_skills: { SK_SQL: 4, SK_TEST_DESIGN: 1 },
      critical_skills: ["SK_SQL"],
    },
  ],
  skills: [
    {
      skill_id: "SK_SQL",
      name: "SQL",
      type: "hard",
      category: "data",
      description: "Запросы к данным",
    },
    {
      skill_id: "SK_TEST_DESIGN",
      name: "Проектирование тестов",
      type: "hard",
      category: "quality",
      description: "Разработка проверок",
    },
  ],
};

export const recommendations: GetRecommendations200 = {
  mode: "ai",
  model: "test-contract-model",
  message: "Подобраны шаги с учетом карьерной цели.",
  generated_at: "2026-10-01T09:00:00.000Z",
  duration_ms: 125,
  recommendations: [
    {
      event: {
        event_id: "EV_SMOKE_SQL",
        title: "Практикум SQL для карьерного роста",
        description:
          "Синтетическое занятие для проверки интеграции интерфейса с API.",
        type: "workshop",
        format: "online",
        duration_hours: 4,
        mandatory: false,
        target_roles: ["Data Analyst"],
        target_grades: ["Junior", "Middle"],
        develops_skills: [{ skill_id: "SK_SQL", gain: 1, max_level: 4 }],
        prerequisites: { SK_SQL: 2 },
        upcoming_sessions: ["2026-10-08"],
      },
      score: 90,
      factors: [
        {
          id: "grade",
          category: "grade",
          text: "Занятие подходит текущему грейду Junior.",
        },
        {
          id: "gap",
          category: "gap",
          text: "Развивает SQL с уровня 2 до 3 при требовании 4.",
        },
        {
          id: "history",
          category: "history",
          text: "Этот практикум еще не завершен.",
        },
        {
          id: "target",
          category: "target",
          text: "Помогает двигаться к цели Data Analyst Middle.",
        },
      ],
      next_session: "2026-10-08",
      gains: [
        { skill_id: "SK_SQL", name: "SQL", before: 2, after: 3, target: 4 },
      ],
      in_progress: false,
      explanation: "Практикум сократит подтвержденный дефицит SQL.",
    },
  ],
};

export const plan: GetCareerPlan200 = {
  employee_id: employeeId,
  current_position: { role: "Data Analyst", grade: "Junior" },
  career_goal: profile.target,
  goal_source: "explicit",
  as_of_date: "2026-10-01",
  last_review_date: "2026-09-01",
  effective_skills: profile.effective_skills,
  counted_completions: [],
  assessment_note:
    "Расчет опирается на последнюю оценку; история без даты завершения не начисляется повторно.",
  readiness: 40,
  projected_readiness: 60,
  projected_skills: { SK_SQL: 3, SK_TEST_DESIGN: 0 },
  trajectory: [
    { event_id: "EV_SMOKE_SQL", readiness_before: 40, readiness_after: 60 },
  ],
  gaps: profile.gaps,
  recommendations: recommendations.recommendations,
  uncovered_skills: ["SK_TEST_DESIGN"],
  mandatory_tasks: [
    {
      event_id: "EV_SMOKE_MANDATORY",
      title: "Обязательный ежегодный инструктаж",
      status: "in_progress",
      due_date: "2026-10-15",
    },
  ],
  warnings: ["Для проектирования тестов нет подходящих занятий в каталоге."],
};

export const advisorReply =
  "Начните с практикума SQL, затем повторно оцените оставшийся дефицит навыка.";
export const chatResponse: ChatWithCareerAdvisor200 = {
  employee_id: employeeId,
  reply: advisorReply,
  plan,
  recommendations,
};

type MockOptions = {
  role?: "employee" | "hr";
  sessionStatus?: number;
  profile?: GetProfile200;
  recommendations?: GetRecommendations200;
  recommendationsStatus?: number;
  recommendationsMessage?: string;
  planStatus?: number;
  planMessage?: string;
  plan?: GetCareerPlan200;
  chatStatus?: number;
  chatMessage?: string;
};

export async function mockStage3Api(page: Page, options: MockOptions = {}) {
  const requests = {
    recommendations: [] as unknown[],
    plans: 0,
    sessions: 0,
    chats: [] as ChatWithCareerAdvisorBodyOne[],
    unexpected: [] as string[],
  };
  async function respond(route: Route, json: unknown, status = 200) {
    await route.fulfill({ status, json });
  }
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/session") {
      requests.sessions += 1;
      await respond(
        route,
        options.sessionStatus
          ? { message: "Сессия истекла." }
          : options.role === "hr"
            ? { ...session, role: "hr", employee_id: null }
            : session,
        options.sessionStatus,
      );
    } else if (path === "/api/catalog") {
      await respond(route, catalog);
    } else if (path === `/api/employees/${employeeId}`) {
      await respond(route, options.profile ?? profile);
    } else if (path === `/api/employees/${employeeId}/recommendations`) {
      requests.recommendations.push(request.postDataJSON());
      await respond(
        route,
        options.recommendationsStatus
          ? {
              message:
                options.recommendationsMessage ??
                "Сервис рекомендаций временно недоступен.",
            }
          : (options.recommendations ?? recommendations),
        options.recommendationsStatus,
      );
    } else if (path === `/api/employees/${employeeId}/plan`) {
      requests.plans += 1;
      await respond(
        route,
        options.planStatus
          ? { message: options.planMessage ?? "AI-план временно недоступен." }
          : (options.plan ?? plan),
        options.planStatus,
      );
    } else if (path === `/api/employees/${employeeId}/chat`) {
      requests.chats.push(request.postDataJSON());
      await respond(
        route,
        options.chatStatus
          ? {
              message:
                options.chatMessage ?? "AI-советник временно недоступен.",
            }
          : chatResponse,
        options.chatStatus,
      );
    } else {
      requests.unexpected.push(`${request.method()} ${path}`);
      await respond(
        route,
        { message: "Unexpected API request in stage 3 test" },
        501,
      );
    }
  });
  return requests;
}
