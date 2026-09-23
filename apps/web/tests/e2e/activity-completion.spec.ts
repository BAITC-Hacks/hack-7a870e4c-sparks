import { expect, type Page, test } from "@playwright/test";
import {
  activityPath,
  activityTitle,
  completedProfile,
  mockCompletionApi,
  nextActivityTitle,
  skillName,
} from "./activity-completion.fixtures";

async function openRecommendedActivity(page: Page) {
  await page.goto("/ru/employee");
  await expect(page.getByText("40%", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Подробнее", exact: true }).click();
  await expect(page).toHaveURL(activityPath);
  await expect(
    page.getByRole("button", { name: "Завершить активность", exact: true }),
  ).toBeEnabled();
}

test("сбой и повторное завершение меняют прогресс только после ответа сервера", async ({
  page,
}, testInfo) => {
  let releaseFirstRequest = () => {};
  const firstRequestPending = new Promise<void>((resolve) => {
    releaseFirstRequest = resolve;
  });
  const api = await mockCompletionApi(page, {
    reply: async (attempt) => {
      if (attempt === 1) {
        await firstRequestPending;
        return { status: 500, json: { message: "Результат не сохранён" } };
      }
      return {
        status: 200,
        json: { profile: completedProfile, already_completed: false },
      };
    },
  });
  await openRecommendedActivity(page);
  const result = page.getByRole("region", { name: "Результат активности" });
  await page.getByRole("button", { name: "Завершить активность" }).click();

  try {
    await expect(
      page.getByRole("button", { name: "Сохраняем результат…", exact: true }),
    ).toBeDisabled();
    await expect(result).toHaveCount(0);
    await expect(page.getByText("60%", { exact: true })).toHaveCount(0);
    await expect.poll(() => api.completionRequests).toBe(1);
  } finally {
    releaseFirstRequest();
  }

  await expect(
    page.getByText("Результат не сохранён", { exact: true }),
  ).toBeVisible();
  await expect(result).toHaveCount(0);
  await expect(page.getByText("60%", { exact: true })).toHaveCount(0);
  const complete = page.getByRole("button", {
    name: "Завершить активность",
    exact: true,
  });
  await expect(complete).toBeEnabled();
  expect(api.completionRequests).toBe(1);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();

  await expect(result).toBeVisible();
  await expect(
    result.getByRole("heading", { name: "Активность завершена", exact: true }),
  ).toBeVisible();
  await expect(result).toContainText("40%");
  await expect(result).toContainText("60%");
  await expect(result).toContainText(skillName);
  await expect(result).toContainText(/2\s*→\s*3/);
  await expect(
    page.getByRole("button", { name: "Активность завершена", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(nextActivityTitle, { exact: true }),
  ).toBeVisible();
  expect(api.completionRequests).toBe(2);
  expect(api.recommendationRequests).toBeGreaterThan(1);
  const screenshotPath = testInfo.outputPath("completion-result.png");
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
  });
  await testInfo.attach("completion-result", {
    path: screenshotPath,
    contentType: "image/png",
  });

  await page.getByRole("link", { name: "К обзору", exact: true }).click();
  await expect(page).toHaveURL("/ru/employee");
  await expect(page.getByText("60%", { exact: true })).toBeVisible();
  await expect(page.getByText("3 / 5", { exact: true })).toBeVisible();
  await expect(
    page.getByText(nextActivityTitle, { exact: true }),
  ).toBeVisible();

  await page.goto("/ru/employee/profile");
  await expect(page.getByText("60%", { exact: true })).toBeVisible();
  await expect(page.getByText("3 / 5", { exact: true })).toBeVisible();
  await expect(page.getByText(activityTitle, { exact: true })).toHaveCount(1);
  await expect(
    page.getByText("Ежегодный обязательный курс", { exact: true }),
  ).toHaveCount(2);
  await expect(page.getByText(/completed · обязательная/)).toHaveCount(2);

  await page.goto(activityPath);
  await page.reload();
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Активность завершена", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Завершить активность", exact: true }),
  ).toHaveCount(0);
  expect(api.completionRequests).toBe(2);
  expect(api.unexpectedRequests).toEqual([]);
});

test("already_completed показывает подтверждённый профиль без двойного начисления", async ({
  page,
}) => {
  const api = await mockCompletionApi(page, {
    reply: async () => ({
      status: 200,
      json: { profile: completedProfile, already_completed: true },
    }),
  });
  await openRecommendedActivity(page);
  await page.getByRole("button", { name: "Завершить активность" }).click();
  const result = page.getByRole("region", { name: "Результат активности" });
  await expect(
    result.getByRole("heading", {
      name: "Активность уже завершена",
      exact: true,
    }),
  ).toBeVisible();
  await expect(result).toContainText("60%");
  await expect(
    page.getByRole("button", { name: "Активность завершена", exact: true }),
  ).toBeDisabled();

  await page.getByRole("link", { name: "К обзору", exact: true }).click();
  await expect(page.getByText("60%", { exact: true })).toBeVisible();
  await expect(page.getByText("3 / 5", { exact: true })).toBeVisible();
  expect(api.completionRequests).toBe(1);
  expect(api.unexpectedRequests).toEqual([]);
});

test("прямая ссылка на завершённую активность восстанавливается из истории", async ({
  page,
}) => {
  const api = await mockCompletionApi(page, { completed: true });
  await page.goto(activityPath);
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Активность завершена", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Активность завершена", exact: true }),
  ).toBeDisabled();
  expect(api.completionRequests).toBe(0);
  expect(api.unexpectedRequests).toEqual([]);
});

test("истёкшая сессия при завершении переводит на вход", async ({ page }) => {
  const api = await mockCompletionApi(page, {
    reply: async () => ({ status: 401, json: { message: "Сессия истекла" } }),
  });
  await openRecommendedActivity(page);
  await page.getByRole("button", { name: "Завершить активность" }).click();
  await expect(page).toHaveURL("/ru/login");
  await expect(
    page.getByRole("button", { name: "Войти", exact: true }),
  ).toBeVisible();
  expect(api.completionRequests).toBe(1);
  expect(api.unexpectedRequests).toEqual([]);
});

test("403 не выдаёт успех и сохраняет исходный профиль", async ({ page }) => {
  const api = await mockCompletionApi(page, {
    reply: async () => ({
      status: 403,
      json: { message: "Нет доступа к завершению активности" },
    }),
  });
  await openRecommendedActivity(page);
  await page.getByRole("button", { name: "Завершить активность" }).click();
  await expect(
    page.getByText("Нет доступа к завершению активности", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Результат активности" }),
  ).toHaveCount(0);
  await page.goto("/ru/employee/profile");
  await expect(page.getByText("40%", { exact: true })).toBeVisible();
  await expect(page.getByText("2 / 5", { exact: true })).toBeVisible();
  await expect(page.getByText(activityTitle, { exact: true })).toHaveCount(0);
  expect(api.completionRequests).toBe(1);
  expect(api.unexpectedRequests).toEqual([]);
});

test("казахский интерфейс завершает активность с уменьшенной анимацией", async ({
  page,
}) => {
  const api = await mockCompletionApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Eligibility and completion dates must use the API snapshot, not today's date.
  await page.clock.setFixedTime(new Date("2030-01-01T00:00:00.000Z"));
  await page.goto("/kk/employee");
  await page.getByRole("link", { name: "Толығырақ", exact: true }).click();
  await expect(page).toHaveURL(activityPath.replace("/ru/", "/kk/"));
  await page
    .getByRole("button", { name: "Белсенділікті аяқтау", exact: true })
    .click();

  const result = page.getByRole("region", { name: "Белсенділік нәтижесі" });
  await expect(
    result.getByRole("heading", { name: "Белсенділік аяқталды", exact: true }),
  ).toBeVisible();
  await expect(result).toContainText("40% → 60%");
  await expect(result).toContainText("2026-10-01");
  await expect(result).toContainText(/2\s*→\s*3/);
  await expect(
    result.getByRole("progressbar", { name: "Мақсатқа дайындық" }),
  ).toHaveAttribute("aria-valuenow", "60");
  await expect(result.locator('[data-slot="progress-indicator"]')).toHaveCSS(
    "transition-property",
    "none",
  );
  await expect(
    page.getByRole("button", { name: "Белсенділік аяқталды", exact: true }),
  ).toBeDisabled();
  expect(api.completionRequests).toBe(1);
  expect(api.unexpectedRequests).toEqual([]);
});

test("пустые рекомендации и неизвестная ссылка не предлагают завершение", async ({
  page,
}) => {
  const api = await mockCompletionApi(page, { emptyRecommendations: true });
  await page.goto("/ru/employee");
  await expect(
    page.getByText("Подходящих добровольных активностей нет.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Подробнее", exact: true }),
  ).toHaveCount(0);

  await page.goto("/ru/employee/activity/unknown-e2e");
  await expect(
    page.getByText("Активность недоступна", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Завершить активность", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "К обзору", exact: true }),
  ).toBeVisible();
  expect(api.completionRequests).toBe(0);
  expect(api.unexpectedRequests).toEqual([]);
});

test("обязательная активность исключена из карточек и заблокирована по прямой ссылке", async ({
  page,
}) => {
  const api = await mockCompletionApi(page, { mandatory: true });
  await page.goto("/ru/employee");
  await expect(page.getByText("40%", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Рекомендация рассчитана по профилю и требованиям цели.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Подробнее", exact: true }),
  ).toHaveCount(0);

  await page.goto(activityPath);
  await expect(
    page.getByRole("heading", { name: activityTitle }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Обязательное мероприятие нельзя завершить в этом сценарии.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Завершить активность", exact: true }),
  ).toBeDisabled();
  expect(api.completionRequests).toBe(0);
  expect(api.unexpectedRequests).toEqual([]);
});
