import { expect, type Page, test } from "@playwright/test";
import {
  advisorReply,
  catalog,
  employeeId,
  mockStage3Api,
  plan,
  profile,
  recommendations,
} from "./stage3-fixtures";

const recommendation = recommendations.recommendations[0];
const activityPath = `/employee/activity/${recommendation.event.event_id}`;

async function navigateFromMenu(page: Page, label: string) {
  const menu = page.getByRole("button", { name: "Открыть меню", exact: true });
  if (await menu.isVisible()) {
    await menu.click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: label, exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: label, exact: true })
      .click();
  }
}

test("API recommendations lead to reloadable activity details", async ({
  page,
}) => {
  const requests = await mockStage3Api(page);
  await page.goto("/ru/employee");
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  expect(requests.recommendations).toEqual([{}]);

  await page.locator(`a[href="/ru${activityPath}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${activityPath}$`));
  await expect(
    page.getByText(recommendation.event.description, { exact: true }),
  ).toBeVisible();
  for (const factor of recommendation.factors) {
    await expect(page.getByText(factor.text, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Онлайн", { exact: true })).toBeVisible();
  await expect(page.getByText("4 ч", { exact: true })).toBeVisible();
  await expect(page.getByText(/Ближайшая сессия:/)).toBeVisible();

  await page.reload();
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(recommendation.factors[0].text, { exact: true }),
  ).toBeVisible();
  expect(requests.sessions).toBeGreaterThanOrEqual(2);
  expect(requests.recommendations.length).toBeGreaterThanOrEqual(2);
  expect(
    requests.recommendations.every((body) => JSON.stringify(body) === "{}"),
  ).toBe(true);
  expect(requests.unexpected).toEqual([]);
});

test("dashboard caps voluntary API recommendations at three with one main step", async ({
  page,
}) => {
  const items = [
    {
      ...recommendation,
      event: {
        ...recommendation.event,
        event_id: "EV_SMOKE_MANDATORY",
        title: "Обязательное занятие не является рекомендацией",
        mandatory: true,
      },
    },
    recommendation,
    ...["A", "B", "C"].map((suffix) => ({
      ...recommendation,
      event: {
        ...recommendation.event,
        event_id: `EV_SMOKE_${suffix}`,
        title: `Альтернативный практикум ${suffix}`,
      },
    })),
  ];
  await mockStage3Api(page, {
    recommendations: { ...recommendations, recommendations: items },
  });
  await page.goto("/ru/employee");
  const section = page.locator(
    'section[aria-labelledby="recommendations-title"]',
  );
  await expect(section.locator("article")).toHaveCount(3);
  await expect(
    section.getByText("Рекомендуемый шаг", { exact: true }),
  ).toHaveCount(1);
  await expect(section.locator('a[href*="/employee/activity/"]')).toHaveCount(
    3,
  );
  await expect(
    section.getByText(items[0].event.title, { exact: true }),
  ).toHaveCount(0);
  await expect(
    section.getByText("Альтернативный практикум C", { exact: true }),
  ).toHaveCount(0);
});

test("rules mode and its API explanation remain explicit", async ({ page }) => {
  const message =
    "AI недоступен: рекомендации рассчитаны по правилам каталога.";
  await mockStage3Api(page, {
    recommendations: {
      ...recommendations,
      mode: "rules",
      model: null,
      message,
    },
  });
  await page.goto("/ru/employee");
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText(/расч[её]тный режим/i).first()).toBeVisible();
  await expect(
    page.getByText("test-contract-model", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(`a[href="/ru${activityPath}"]`)).toHaveCount(1);
});

test("empty recommendations show the API reason without a fabricated activity", async ({
  page,
}) => {
  const message =
    "Для выбранной цели в каталоге нет доступных добровольных занятий.";
  await mockStage3Api(page, {
    recommendations: {
      ...recommendations,
      mode: "rules",
      model: null,
      message,
      recommendations: [],
    },
  });
  await page.goto("/ru/employee");
  await expect(page.getByText(message, { exact: true }).first()).toBeVisible();
  await expect(page.locator('a[href*="/employee/activity/"]')).toHaveCount(0);
});

test("recommendation errors are retryable and preserve the employee profile", async ({
  page,
}) => {
  const message = "Сервис рекомендаций временно недоступен.";
  const options = {
    recommendationsStatus: 500,
    recommendationsMessage: message,
  };
  const requests = await mockStage3Api(page, options);
  await page.goto("/ru/employee");
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText("40%", { exact: true })).toBeVisible();
  const beforeRetry = requests.recommendations.length;
  options.recommendationsStatus = 0;
  await page.getByRole("button", { name: /повторить/i }).click();
  await expect
    .poll(() => requests.recommendations.length)
    .toBeGreaterThan(beforeRetry);
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(message, { exact: true })).toHaveCount(0);
});

test("Kazakh career page displays forecast, mandatory tasks and uncovered skills on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockStage3Api(page);
  await page.goto("/kk/employee/career");
  await expect(page.getByText("40%", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("60%", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Талаптардың болжамды қамтылуы", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(plan.mandatory_tasks[0].title, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(plan.warnings[0], { exact: true })).toBeVisible();
  await expect(
    page.getByText(plan.assessment_note, { exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  const width = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
  await page.getByRole("button", { name: "Мәзірді ашу" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Шолу", exact: true })
    .click();
  await expect(page).toHaveURL(/\/kk\/employee$/);
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("plan 503 explains AI unavailability without invented progress", async ({
  page,
}) => {
  const message = "AI-план временно недоступен.";
  await mockStage3Api(page, { planStatus: 503, planMessage: message });
  await page.goto("/ru/employee/career");
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText("60%", { exact: true })).toHaveCount(0);
});

test("a failed plan refresh preserves the last computed forecast", async ({
  page,
}) => {
  const options = {
    planStatus: 0,
    planMessage: "Обновление плана недоступно.",
  };
  await mockStage3Api(page, options);
  await page.goto("/ru/employee/career");
  await expect(page.getByText("60%", { exact: true }).first()).toBeVisible();
  options.planStatus = 503;
  await page
    .getByRole("button", { name: "Обновить план", exact: true })
    .click();
  await expect(
    page.getByText(options.planMessage, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/сохранён последний расчёт/i)).toBeVisible();
  await expect(page.getByText("40%", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("60%", { exact: true }).first()).toBeVisible();
});

test("advisor sends only the message and bounded dialogue context", async ({
  page,
}) => {
  const requests = await mockStage3Api(page);
  await page.goto("/ru/employee");
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  const recommendationsBeforeChat = requests.recommendations.length;
  await navigateFromMenu(page, "Карьерный путь");
  const input = page.getByRole("textbox");
  await expect(input).toBeVisible();
  const plansBeforeChat = requests.plans;
  await expect(input).toHaveAttribute("maxlength", "3000");
  const send = page.getByRole("button", { name: /отправить/i });
  await expect(send).toBeDisabled();
  await input.fill("Как сократить дефицит SQL?");
  await send.click();
  await expect(page.getByText(advisorReply, { exact: true })).toBeVisible();
  await expect.poll(() => requests.plans).toBeGreaterThan(plansBeforeChat);
  expect(requests.chats).toHaveLength(1);
  expect(requests.chats[0].message).toBe("Как сократить дефицит SQL?");
  expect(requests.chats[0].conversation_history ?? []).toEqual([]);
  expect(Object.keys(requests.chats[0]).sort()).toEqual([
    "conversation_history",
    "message",
  ]);

  await input.fill("Какой следующий шаг после практикума?");
  await send.click();
  await expect.poll(() => requests.chats.length).toBe(2);
  expect(requests.chats[1].conversation_history).toEqual([
    { role: "user", content: "Как сократить дефицит SQL?" },
    { role: "assistant", content: advisorReply },
  ]);
  expect(requests.chats[1].conversation_history?.length).toBeLessThanOrEqual(
    20,
  );
  expect(Object.keys(requests.chats[1]).sort()).toEqual([
    "conversation_history",
    "message",
  ]);
  await expect(
    page.getByRole("log").getByText(advisorReply, { exact: true }),
  ).toHaveCount(2);
  await navigateFromMenu(page, "Обзор");
  await expect
    .poll(() => requests.recommendations.length)
    .toBeGreaterThan(recommendationsBeforeChat);
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  expect(requests.unexpected).toEqual([]);
});

test("advisor 503 keeps the current plan and does not add a fake reply", async ({
  page,
}) => {
  const message = "AI-советник временно недоступен";
  const options = { chatStatus: 503, chatMessage: message };
  const requests = await mockStage3Api(page, options);
  await page.goto("/ru/employee/career");
  await page.getByRole("textbox").fill("Какой навык развивать?");
  await page.getByRole("button", { name: /отправить/i }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText(advisorReply, { exact: true })).toHaveCount(0);
  await expect(page.getByText("40%", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(plan.mandatory_tasks[0].title, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("Какой навык развивать?");
  options.chatStatus = 0;
  await page
    .getByRole("button", { name: "Повторить отправку", exact: true })
    .click();
  await expect(page.getByText(advisorReply, { exact: true })).toBeVisible();
  expect(requests.chats).toHaveLength(2);
  expect(requests.chats[1].conversation_history).toEqual([]);
});

test("HR session cannot enter the employee recommendation scenario", async ({
  page,
}) => {
  const requests = await mockStage3Api(page, { role: "hr" });
  await page.goto("/ru/employee/career");
  await expect(page.getByRole("heading", { name: /доступ/i })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect(requests.plans).toBe(0);
  expect(requests.recommendations).toHaveLength(0);
  expect(requests.unexpected).toEqual([]);
});

test("activity details explain unavailable audience, prerequisites and session", async ({
  page,
}) => {
  await mockStage3Api(page, {
    recommendations: {
      ...recommendations,
      recommendations: [
        {
          ...recommendation,
          next_session: null,
          event: {
            ...recommendation.event,
            target_roles: ["QA Engineer"],
            prerequisites: { SK_SQL: 4 },
            upcoming_sessions: [],
          },
        },
      ],
    },
  });
  await page.goto(`/ru${activityPath}`);
  await expect(
    page.getByText("Не соответствует текущей роли или грейду.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Сначала нужно освоить начальные навыки.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("На дату расчёта нет доступной сессии.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("SQL: сейчас 2 · требуется 4", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Завершить активность",
      exact: true,
    }),
  ).toBeDisabled();
});

test("plan activity remains reloadable when absent from current recommendations", async ({
  page,
}) => {
  const requests = await mockStage3Api(page, {
    recommendations: { ...recommendations, recommendations: [] },
  });
  await page.goto(`/ru${activityPath}`);
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  expect(requests.plans).toBe(1);
  await page.reload();
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  expect(requests.plans).toBe(2);
  expect(requests.unexpected).toEqual([]);
});

for (const scenario of [
  {
    name: "a prior-day EV_036 completion allows a plan-only repeat",
    eventId: "EV_036",
    date: "2026-09-30",
    completedAt: "2026-09-30T12:00:00.000Z",
    canRepeat: true,
  },
  {
    name: "an EV_036 completion on the calculation date skips the plan",
    eventId: "EV_036",
    date: catalog.as_of_date,
    completedAt: null,
    canRepeat: false,
  },
  {
    name: "an EV_036 completion timestamp on the calculation date skips the plan",
    eventId: "EV_036",
    date: "2026-09-30",
    completedAt: `${catalog.as_of_date}T12:00:00.000Z`,
    canRepeat: false,
  },
  {
    name: "a completed nonrepeatable activity skips the plan",
    eventId: recommendation.event.event_id,
    date: "2026-09-30",
    completedAt: "2026-09-30T12:00:00.000Z",
    canRepeat: false,
  },
]) {
  test(scenario.name, async ({ page }) => {
    const requests = await mockStage3Api(page, {
      profile: {
        ...profile,
        history: [
          {
            record_id: "completed-plan-activity",
            employee_id: employeeId,
            event_id: scenario.eventId,
            title: recommendation.event.title,
            date: scenario.date,
            completed_at: scenario.completedAt,
            due_date: null,
            status: "completed",
            completion_pct: 100,
            score: null,
            feedback_rating: null,
            assigned_by: "self",
            mandatory: false,
          },
        ],
      },
      recommendations: { ...recommendations, recommendations: [] },
      plan: {
        ...plan,
        recommendations: [
          {
            ...recommendation,
            event: {
              ...recommendation.event,
              event_id: scenario.eventId,
            },
          },
        ],
      },
    });
    await page.goto(`/ru/employee/activity/${scenario.eventId}`);
    await expect(
      page.getByText(recommendation.event.title, { exact: true }),
    ).toBeVisible();
    if (scenario.canRepeat) {
      await expect(
        page.getByRole("button", {
          name: "Завершить активность",
          exact: true,
        }),
      ).toBeEnabled();
      expect(requests.plans).toBe(1);
    } else {
      await expect(
        page.getByRole("button", {
          name: "Активность завершена",
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", {
          name: "Завершить активность",
          exact: true,
        }),
      ).toHaveCount(0);
      expect(requests.plans).toBe(0);
    }
    expect(requests.unexpected).toEqual([]);
  });
}

test("an expired advisor request returns to login without retrying", async ({
  page,
}) => {
  const options = { sessionStatus: 0, chatStatus: 0 };
  const requests = await mockStage3Api(page, options);
  await page.goto("/kk/employee/career");
  await page.getByRole("textbox").fill("Келесі қадам қандай?");
  options.sessionStatus = 401;
  options.chatStatus = 401;
  await page.getByRole("button", { name: "Жіберу", exact: true }).click();
  await expect(page).toHaveURL(/\/kk\/login$/);
  expect(requests.chats).toHaveLength(1);
  expect(requests.unexpected).toEqual([]);
});

test("an expired recommendation request returns to login without retrying", async ({
  page,
}) => {
  const options = { sessionStatus: 0, recommendationsStatus: 0 };
  const requests = await mockStage3Api(page, options);
  await page.goto("/ru/employee");
  await expect(
    page.getByText(recommendation.event.title, { exact: true }),
  ).toBeVisible();
  options.sessionStatus = 401;
  options.recommendationsStatus = 401;
  const beforeExpiry = requests.recommendations.length;
  await page
    .locator('section[aria-labelledby="recommendations-title"]')
    .getByRole("button", { name: "Обновить рекомендации", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ru\/login$/);
  await expect(
    page.getByRole("heading", { name: "Вход в демо", exact: true }),
  ).toBeVisible();
  expect(requests.recommendations.length).toBe(beforeExpiry + 1);
  expect(requests.unexpected).toEqual([]);
});
