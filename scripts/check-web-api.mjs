#!/usr/bin/env node

// Run from the repository: node scripts/check-web-api.mjs
// Requires Playwright and Chromium installed in apps/web, plus exported
// WEB_SMOKE_EMPLOYEE_PASSWORD and WEB_SMOKE_HR_PASSWORD. Never reads .env.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const requireWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const employeeId = process.env.WEB_SMOKE_EMPLOYEE_ID || "E0005";
const employeePassword = process.env.WEB_SMOKE_EMPLOYEE_PASSWORD;
const hrPassword = process.env.WEB_SMOKE_HR_PASSWORD;
const secrets = [employeePassword, hrPassword].filter(Boolean);
let browser;

function safeError(error) {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) {
    message = message.split(secret).join("[redacted]");
    message = message.split(JSON.stringify(secret).slice(1, -1)).join("[redacted]");
  }
  return message;
}

try {
  assert(employeePassword, "Set WEB_SMOKE_EMPLOYEE_PASSWORD in the environment.");
  assert(hrPassword, "Set WEB_SMOKE_HR_PASSWORD in the environment.");
  const target = new URL(process.env.WEB_SMOKE_URL || "http://localhost:3000");
  assert(["http:", "https:"].includes(target.protocol), "WEB_SMOKE_URL must use HTTP or HTTPS.");
  assert(!target.username && !target.password, "WEB_SMOKE_URL must not contain credentials.");

  const { chromium } = requireWeb("playwright");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: target.origin,
    viewport: { width: 1280, height: 900 },
    locale: "ru-RU",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(30_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(safeError(error)));

  async function api(path, expectedStatus) {
    const result = await page.evaluate(async (requestPath) => {
      const response = await fetch(requestPath, {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      return {
        status: response.status,
        json: await response.json().catch(() => null),
      };
    }, path);
    assert.equal(result.status, expectedStatus, `GET ${path}: unexpected status`);
    assert(result.json !== null, `GET ${path}: expected a JSON response`);
    return result.json;
  }

  async function login(username, password, destination) {
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await page.waitForURL((url) => url.pathname === `/ru/${destination}`);
    await page.getByRole("button", { name: "Выйти", exact: true }).waitFor();
  }

  await page.goto("/ru/login");
  await login(employeeId, employeePassword, "employee");
  const session = await api("/api/auth/session", 200);
  assert.equal(session.role, "employee", "Login must establish an employee session");
  assert.equal(session.employee_id, employeeId, "Session must belong to the requested employee");
  const profile = await api(`/api/employees/${encodeURIComponent(employeeId)}`, 200);
  assert.equal(profile.employee?.employee_id, employeeId, "Profile must belong to the employee");
  assert.equal(typeof profile.employee.full_name, "string", "Profile must include a name");
  assert(profile.employee.full_name.length > 0, "Profile name must not be empty");
  await page.getByText(profile.employee.full_name, { exact: true }).last().waitFor();
  const catalog = await api("/api/catalog", 200);
  assert(Array.isArray(catalog.roles) && catalog.roles.length > 0, "Catalog must include roles");
  await api("/api/hr/overview", 403);
  await api("/api/employees", 403);
  // Authorization must reject every distinct employee ID, including unknown IDs.
  const otherId = employeeId === "__smoke_other__" ? "__smoke_other_2__" : "__smoke_other__";
  await api(`/api/employees/${encodeURIComponent(otherId)}`, 403);
  console.log("PASS employee login, profile, catalog and access restrictions");

  await page.reload();
  await page.getByRole("button", { name: "Выйти", exact: true }).waitFor();
  const restoredSession = await api("/api/auth/session", 200);
  assert.equal(restoredSession.employee_id, employeeId, "Reload must preserve the session");
  await page.getByRole("link", { name: "Профиль", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/ru/employee/profile");
  await page.getByText(profile.employee.full_name, { exact: true }).last().waitFor();
  await page.getByText("История активностей", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Сохранить цель", exact: true }).waitFor();
  console.log("PASS session survives reload and profile navigation renders API data");

  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/ru/login");
  await page.getByRole("button", { name: "Войти", exact: true }).waitFor();
  await api("/api/auth/session", 401);
  await api(`/api/employees/${encodeURIComponent(employeeId)}`, 401);
  console.log("PASS logout invalidates the session");

  await page.getByRole("button", { name: "HR", exact: true }).click();
  await login("hr", hrPassword, "hr");
  const hrSession = await api("/api/auth/session", 200);
  assert.equal(hrSession.role, "hr", "HR login must establish an HR session");
  const overview = await api("/api/hr/overview", 200);
  assert(Number.isInteger(overview.total_employees), "HR overview must include an employee count");
  const employees = await api("/api/employees", 200);
  assert(Array.isArray(employees.employees), "HR employee list must be an array");
  assert(employees.employees.some((employee) => employee.employee_id === employeeId), "HR list must include the smoke employee");
  console.log("PASS HR login, overview and employees");

  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/ru/login");
  assert.equal(pageErrors.length, 0, `Browser runtime errors: ${pageErrors.join("; ")}`);
  console.log("PASS web/API smoke test; goals, history and imported data unchanged");
} catch (error) {
  console.error(`FAIL web/API smoke test: ${safeError(error)}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
