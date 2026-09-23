import { expect, test } from "@playwright/test";

test("главная страница имеет заголовок", async ({ page }) => {
  await page.goto("/ru");

  // Проверяем, что заголовок вкладки содержит название архитектуры
  await expect(page).toHaveTitle(/Crystal Architecture/);
});

test("главная страница отображает приветствие и профиль пользователя", async ({
  page,
}) => {
  await page.goto("/ru");

  // Проверяем наличие заголовка приветствия
  await expect(
    page.getByRole("heading", { level: 1, name: "Добро пожаловать" }),
  ).toBeVisible();

  // Проверяем наличие профиля пользователя
  await expect(
    page.getByRole("heading", { name: "John Doe", exact: true }),
  ).toBeVisible();
  await expect(page.locator("text=john.doe@example.com")).toBeVisible();
});
