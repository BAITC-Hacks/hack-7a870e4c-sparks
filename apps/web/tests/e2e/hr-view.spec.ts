import { expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  alpha,
  beta,
  emptyHrOverview,
  gamma,
  hrSkillName,
  mockHrApi,
  withoutStepReason,
} from "./hr-view.fixtures";

async function expectParameter(page: Page, key: string, value: string | null) {
  await expect
    .poll(() => new URL(page.url()).searchParams.get(key))
    .toBe(value);
}

async function selectFilter(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

test("HR-обзор показывает серверные агрегаты и ведёт к сотрудникам без шага", async ({
  page,
}, testInfo) => {
  const api = await mockHrApi(page);
  await page.goto("/ru/hr");
  const main = page.getByRole("main");
  await expect(main.getByText("37", { exact: true })).toBeVisible();
  await expect(main).toContainText("2026-10-01");
  await expect(
    main.getByText(withoutStepReason, { exact: true }),
  ).toBeVisible();
  const gaps = page.getByRole("region", { name: "Дефициты навыков" });
  await expect(gaps).toContainText(hrSkillName);
  await expect(gaps).toContainText("19");
  await expect(gaps).toContainText(/1[,.]75/);
  const participation = page.getByRole("region", {
    name: "Участие в мероприятиях",
  });
  await expect(participation).toContainText("Практикум по архитектуре");
  await expect(participation).toContainText("Ежегодный compliance");
  for (const value of ["11", "5", "2", "18", "29", "4", "34"]) {
    await expect(
      participation.getByText(value, { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  }
  await expect(
    participation
      .getByText("Обязательное", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(main).not.toContainText("%");
  await attachScreenshot(page, testInfo, "hr-overview");

  await page
    .getByRole("link", { name: "Сотрудники без следующего шага", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ru\/hr\/employees\?withoutStep=true$/);
  await expect(
    page.getByRole("checkbox", { name: "Без следующего шага" }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: beta.full_name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: alpha.full_name, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: gamma.full_name, exact: true }),
  ).toHaveCount(0);
  expect(api.unexpectedRequests).toEqual([]);
});

test("фильтры списка сохраняются в URL, переживают reload и сбрасываются", async ({
  page,
}) => {
  const api = await mockHrApi(page);
  await page.goto("/ru/hr/employees");
  const search = page.getByRole("searchbox", { name: "Поиск сотрудников" });
  await expect(
    page.getByRole("button", { name: alpha.full_name, exact: true }),
  ).toBeVisible();
  await search.fill("Алия");
  await expectParameter(page, "q", "Алия");
  await expect(
    page.getByRole("button", { name: beta.full_name, exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(search).toHaveValue("Алия");
  await expect(
    page.getByRole("button", { name: alpha.full_name, exact: true }),
  ).toBeVisible();

  await search.fill("");
  await selectFilter(page, "Подразделение", "Аналитика");
  await selectFilter(page, "Роль", "Разработчик");
  await selectFilter(page, "Грейд", "Senior");
  await expectParameter(page, "q", null);
  await expectParameter(page, "department", "Аналитика");
  await expectParameter(page, "role", "Разработчик");
  await expectParameter(page, "grade", "Senior");
  await expect(
    page.getByRole("button", { name: gamma.full_name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: alpha.full_name, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: beta.full_name, exact: true }),
  ).toHaveCount(0);
  // Filters are local: typing and selecting must not issue directory requests.
  expect(api.directoryRequests).toBe(2);

  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Подразделение", exact: true }),
  ).toContainText("Аналитика");
  await expect(
    page.getByRole("combobox", { name: "Роль", exact: true }),
  ).toContainText("Разработчик");
  await expect(
    page.getByRole("combobox", { name: "Грейд", exact: true }),
  ).toContainText("Senior");
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  for (const key of ["q", "department", "role", "grade", "withoutStep"]) {
    await expectParameter(page, key, null);
  }
  for (const employee of [alpha, beta, gamma]) {
    await expect(
      page.getByRole("button", { name: employee.full_name, exact: true }),
    ).toBeVisible();
  }
  expect(api.unexpectedRequests).toEqual([]);
});

test("Sheet использует push при открытии и replace при закрытии, deep link доступен только для чтения", async ({
  page,
}, testInfo) => {
  const api = await mockHrApi(page);
  await page.goto("/ru/hr/employees");
  await page
    .getByRole("button", { name: alpha.full_name, exact: true })
    .click();
  await expectParameter(page, "employee", alpha.employee_id);
  const sheet = page.getByRole("dialog", {
    name: "Профиль сотрудника",
    exact: true,
  });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("42%", { exact: true })).toBeVisible();
  await expect(
    sheet.getByText(`История: ${alpha.full_name}`, { exact: true }),
  ).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Сохранить цель", exact: true }),
  ).toHaveCount(0);
  await expect(
    sheet.getByRole("button", { name: "Сбросить цель", exact: true }),
  ).toHaveCount(0);
  await expect(
    sheet.getByRole("button", { name: "Завершить активность", exact: true }),
  ).toHaveCount(0);
  await attachScreenshot(page, testInfo, "hr-profile-sheet");

  await page.goBack();
  await expectParameter(page, "employee", null);
  await expect(sheet).toHaveCount(0);
  await page.goForward();
  await expectParameter(page, "employee", alpha.employee_id);
  await expect(sheet).toBeVisible();
  await page
    .getByRole("button", { name: "Закрыть профиль", exact: true })
    .click();
  await expectParameter(page, "employee", null);
  await expect(sheet).toHaveCount(0);
  await page.goBack();
  await expectParameter(page, "employee", null);
  await expect(sheet).toHaveCount(0);
  await page.goForward();
  await expect(sheet).toHaveCount(0);

  await page.getByRole("button", { name: beta.full_name, exact: true }).click();
  await expectParameter(page, "employee", beta.employee_id);
  await page.reload();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("73%", { exact: true })).toBeVisible();
  await expect(
    sheet.getByText(`История: ${beta.full_name}`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  expect(api.unexpectedRequests).toEqual([]);
});

test("поздний ответ первого профиля не заменяет выбранного сотрудника", async ({
  page,
}) => {
  let releaseAlpha = () => {};
  const pendingAlpha = new Promise<void>((resolve) => {
    releaseAlpha = resolve;
  });
  const api = await mockHrApi(page, {
    beforeProfile: async (id) => {
      if (id === alpha.employee_id) await pendingAlpha;
    },
  });
  await page.goto("/ru/hr/employees");
  await page
    .getByRole("button", { name: alpha.full_name, exact: true })
    .click();
  await expect
    .poll(() => api.profileRequests.includes(alpha.employee_id))
    .toBe(true);
  const alphaResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/employees/${alpha.employee_id}`),
  );
  const sheet = page.getByRole("dialog", {
    name: "Профиль сотрудника",
    exact: true,
  });
  try {
    await expect(sheet.getByText("42%", { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Закрыть профиль", exact: true })
      .click();
    await page
      .getByRole("button", { name: beta.full_name, exact: true })
      .click();
    await expectParameter(page, "employee", beta.employee_id);
    await expect(sheet.getByText("73%", { exact: true })).toBeVisible();
  } finally {
    releaseAlpha();
  }
  await alphaResponse;
  await expect(
    sheet.getByText(`История: ${beta.full_name}`, { exact: true }),
  ).toBeVisible();
  await expect(sheet.getByText("42%", { exact: true })).toHaveCount(0);
  await expect(
    sheet.getByText(`История: ${alpha.full_name}`, { exact: true }),
  ).toHaveCount(0);
  expect(api.unexpectedRequests).toEqual([]);
});

test("роль employee не загружает HR-данные при прямом открытии обоих маршрутов", async ({
  page,
}) => {
  const api = await mockHrApi(page, { role: "employee" });
  for (const path of [
    "/ru/hr",
    `/ru/hr/employees?employee=${beta.employee_id}`,
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Доступ запрещён", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(api.privilegedRequests).toEqual([]);
  expect(api.unexpectedRequests).toEqual([]);
});

test("403 профиля показывает запрет внутри Sheet без персональных данных", async ({
  page,
}) => {
  const api = await mockHrApi(page, {
    profileStatus: { [alpha.employee_id]: 403 },
  });
  await page.goto(`/ru/hr/employees?employee=${alpha.employee_id}`);
  const sheet = page.getByRole("dialog", {
    name: "Профиль сотрудника",
    exact: true,
  });
  await expect(
    sheet.getByText("Нет доступа к профилю", { exact: true }),
  ).toBeVisible();
  await expect(sheet.getByText("42%", { exact: true })).toHaveCount(0);
  await expect(
    sheet.getByText(`История: ${alpha.full_name}`, { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Закрыть профиль", exact: true })
    .click();
  await expect(sheet).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: beta.full_name, exact: true }),
  ).toBeVisible();
  expect(api.unexpectedRequests).toEqual([]);
});

test("401 HR-обзора сбрасывает сессию и открывает вход", async ({ page }) => {
  const api = await mockHrApi(page, { overviewStatus: 401 });
  await page.goto("/ru/hr");
  await expect(page).toHaveURL("/ru/login");
  await expect(
    page.getByRole("button", { name: "Войти", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("37", { exact: true })).toHaveCount(0);
  expect(api.unexpectedRequests).toEqual([]);
});

test("ошибка HR-обзора допускает явный повтор без фиктивных метрик", async ({
  page,
}) => {
  let releaseOverview = () => {};
  const pendingOverview = new Promise<void>((resolve) => {
    releaseOverview = resolve;
  });
  const api = await mockHrApi(page, {
    overviewStatus: 500,
    beforeOverview: () => pendingOverview,
  });
  await page.goto("/ru/hr");
  try {
    await expect(
      page.getByRole("status", {
        name: "Загружаем HR-аналитику…",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("37", { exact: true })).toHaveCount(0);
  } finally {
    releaseOverview();
  }
  await expect(
    page.getByText("HR-обзор временно недоступен", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("37", { exact: true })).toHaveCount(0);
  api.overviewStatus = 200;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByText("37", { exact: true })).toBeVisible();
  await expect(
    page.getByText(withoutStepReason, { exact: true }),
  ).toBeVisible();
  expect(api.overviewRequests).toBeGreaterThan(1);
  expect(api.unexpectedRequests).toEqual([]);
});

test("нулевые метрики и пустые массивы имеют отдельные состояния", async ({
  page,
}) => {
  const api = await mockHrApi(page, {
    overview: emptyHrOverview,
    employees: [],
  });
  await page.goto("/ru/hr");
  await expect(
    page.getByText("Сотрудников пока нет", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Дефицитов навыков нет", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("История участия пока пуста", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Сотрудников без следующего шага нет", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("0", { exact: true }),
  ).toHaveCount(2);
  await expect(page.getByRole("main")).not.toContainText("%");
  expect(api.unexpectedRequests).toEqual([]);
});

test("пустой список и неизвестный профиль не подменяются чужими данными", async ({
  page,
}) => {
  const api = await mockHrApi(page, {
    employees: [],
    overview: emptyHrOverview,
  });
  await page.goto("/ru/hr/employees");
  await expect(
    page.getByText("Список сотрудников пуст", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: alpha.full_name, exact: true }),
  ).toHaveCount(0);
  await page.goto("/ru/hr/employees?employee=unknown-hr-e2e");
  const sheet = page.getByRole("dialog", {
    name: "Профиль сотрудника",
    exact: true,
  });
  await expect(
    sheet.getByText("Сотрудник не найден", { exact: true }),
  ).toBeVisible();
  await expect(sheet.getByText("42%", { exact: true })).toHaveCount(0);
  expect(api.unexpectedRequests).toEqual([]);
});

test("казахский HR-интерфейс сохраняет локаль при переходе к профилю", async ({
  page,
}) => {
  const api = await mockHrApi(page);
  await page.goto("/kk/hr");
  await expect(
    page.getByText("Қызметкерлер саны", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Келесі қадамы жоқ қызметкерлер", exact: true })
    .click();
  await expect(page).toHaveURL(/\/kk\/hr\/employees\?withoutStep=true$/);
  await page.getByRole("button", { name: beta.full_name, exact: true }).click();
  const sheet = page.getByRole("dialog", {
    name: "Қызметкер профилі",
    exact: true,
  });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("73%", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  expect(api.unexpectedRequests).toEqual([]);
});
