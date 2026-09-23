import { expect, test } from "@playwright/test";

for (const [source, destination] of [
  ["/ru", "/ru/login"],
  ["/kk", "/kk/login"],
  ["/kz", "/kk/login"],
] as const) {
  test(`${source} redirects to authorization`, async ({ page }) => {
    await page.goto(source);

    await expect(page).toHaveURL(destination);
  });
}
