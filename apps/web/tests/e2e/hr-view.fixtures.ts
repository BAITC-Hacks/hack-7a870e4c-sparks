import { expect, type Page } from "@playwright/test";
import type {
  GetCatalog200,
  GetEmployees200,
  GetHrOverview200,
  GetProfile200,
} from "../../src/shared/api/generated";

export const hrEmployees: GetEmployees200["employees"] = [
  {
    employee_id: "hr-alpha-e2e",
    full_name: "Алия Тестовая",
    department: "Аналитика",
    role: "Аналитик",
    grade: "Middle",
  },
  {
    employee_id: "hr-beta-e2e",
    full_name: "Бекзат Проверочный",
    department: "Инженерия",
    role: "Разработчик",
    grade: "Junior",
  },
  {
    employee_id: "hr-gamma-e2e",
    full_name: "Гульнар Контрольная",
    department: "Аналитика",
    role: "Разработчик",
    grade: "Senior",
  },
];

export const alpha = hrEmployees[0];
export const beta = hrEmployees[1];
export const gamma = hrEmployees[2];
export const withoutStepReason = "В каталоге нет доступных занятий для цели.";
export const hrSkillName = "Архитектурное мышление";
const skillId = "hr-skill-e2e";

export const hrOverview: GetHrOverview200 = {
  // The response aggregates must not be reconstructed from the directory fixture.
  total_employees: 37,
  as_of_date: "2026-10-01",
  employees_without_step: [
    {
      employee_id: beta.employee_id,
      full_name: beta.full_name,
      role: beta.role,
      reason: withoutStepReason,
    },
  ],
  skill_gaps: [
    {
      skill_id: skillId,
      name: hrSkillName,
      employees: 19,
      average_gap: 1.75,
    },
  ],
  participation: [
    {
      event_id: "hr-voluntary-e2e",
      title: "Практикум по архитектуре",
      mandatory: false,
      completed: 11,
      in_progress: 5,
      other: 2,
      total: 18,
    },
    {
      event_id: "hr-mandatory-e2e",
      title: "Ежегодный compliance",
      mandatory: true,
      completed: 29,
      in_progress: 4,
      other: 1,
      total: 34,
    },
  ],
};

export const emptyHrOverview: GetHrOverview200 = {
  total_employees: 0,
  employees_without_step: [],
  skill_gaps: [],
  participation: [],
  as_of_date: "2026-10-01",
};

const catalog: GetCatalog200 = {
  as_of_date: "2026-10-01",
  roles: ["Аналитик", "Разработчик"].map((role) => ({
    role,
    grade: "Senior",
    required_skills: { [skillId]: 5 },
    critical_skills: [skillId],
  })),
  skills: [
    {
      skill_id: skillId,
      name: hrSkillName,
      type: "hard",
      category: "Разработка",
      description: "Проектирование и оценка архитектурных решений",
    },
  ],
};

function profileFor(
  employee: GetEmployees200["employees"][number],
  readiness: number,
  level: number,
): GetProfile200 {
  const target = {
    target_role: employee.role,
    target_grade: "Senior" as const,
  };
  return {
    employee: {
      ...employee,
      manager_id: null,
      hire_date: "2024-01-01",
      tenure_months: 33,
      work_format: "hybrid",
      preferred_language: "ru",
      career_goal: target,
      skills: { [skillId]: level },
      last_review_date: "2026-09-20",
    },
    target,
    target_source: "explicit",
    readiness,
    effective_skills: { [skillId]: level },
    gaps: [
      {
        skill_id: skillId,
        name: hrSkillName,
        current: level,
        required: 5,
        gap: 5 - level,
        critical: true,
        covered: true,
      },
    ],
    history: [
      {
        record_id: `history-${employee.employee_id}`,
        employee_id: employee.employee_id,
        event_id: "hr-mandatory-e2e",
        title: `История: ${employee.full_name}`,
        date: "2026-09-01",
        due_date: "2026-09-30",
        status: "completed",
        completion_pct: 100,
        score: 90,
        feedback_rating: null,
        assigned_by: "hr",
        mandatory: true,
      },
    ],
    warnings: [],
  };
}

export const hrProfiles: Record<string, GetProfile200> = {
  [alpha.employee_id]: profileFor(alpha, 42, 2),
  [beta.employee_id]: profileFor(beta, 73, 4),
  [gamma.employee_id]: profileFor(gamma, 85, 5),
};

export async function mockHrApi(
  page: Page,
  options: {
    role?: "hr" | "employee";
    overview?: GetHrOverview200;
    employees?: GetEmployees200["employees"];
    overviewStatus?: number;
    profileStatus?: Record<string, number>;
    beforeOverview?: () => Promise<void>;
    beforeProfile?: (employeeId: string) => Promise<void>;
  } = {},
) {
  const state = {
    authenticated: true,
    overviewStatus: options.overviewStatus ?? 200,
    profileStatus: options.profileStatus ?? {},
    overviewRequests: 0,
    directoryRequests: 0,
    profileRequests: [] as string[],
    privilegedRequests: [] as string[],
    unexpectedRequests: [] as string[],
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    expect(request.method()).toBe("GET");

    if (path === "/api/auth/session") {
      await route.fulfill({
        status: state.authenticated ? 200 : 401,
        json: state.authenticated
          ? {
              username: "hr-e2e",
              role: options.role ?? "hr",
              employee_id:
                options.role === "employee" ? alpha.employee_id : null,
              full_name: "HR Тестовый",
            }
          : { message: "Сессия истекла" },
      });
      return;
    }

    state.privilegedRequests.push(path);
    if (path === "/api/hr/overview") {
      state.overviewRequests += 1;
      await options.beforeOverview?.();
      if (state.overviewStatus === 401) state.authenticated = false;
      await route.fulfill({
        status: state.overviewStatus,
        json:
          state.overviewStatus === 200
            ? (options.overview ?? hrOverview)
            : {
                message:
                  state.overviewStatus === 401
                    ? "Сессия истекла"
                    : "HR-обзор временно недоступен",
              },
      });
      return;
    }
    if (path === "/api/employees") {
      state.directoryRequests += 1;
      expect(url.search).toBe("");
      await route.fulfill({
        json: { employees: options.employees ?? hrEmployees },
      });
      return;
    }
    if (path === "/api/catalog") {
      await route.fulfill({ json: catalog });
      return;
    }
    if (path.startsWith("/api/employees/")) {
      const employeeId = decodeURIComponent(
        path.slice("/api/employees/".length),
      );
      state.profileRequests.push(employeeId);
      await options.beforeProfile?.(employeeId);
      const profile = hrProfiles[employeeId];
      const status = state.profileStatus[employeeId] ?? (profile ? 200 : 404);
      if (status === 401) state.authenticated = false;
      await route.fulfill({
        status,
        json:
          status === 200
            ? profile
            : {
                message:
                  status === 403
                    ? "Нет доступа к профилю сотрудника"
                    : "Профиль сотрудника не найден",
              },
      });
      return;
    }

    state.unexpectedRequests.push(path);
    await route.fulfill({
      status: 404,
      json: { message: "Unexpected API call" },
    });
  });

  return state;
}
