import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { createApp } from "../src/app";
import type { Profile, Recommendations } from "../src/contracts";
import type { ChatResponse, Plan } from "../src/modules/recommendations/model";
import { readConfig } from "../src/utils/config";
import { loadDataset } from "../src/utils/dataset";
import { createTestStore } from "./database";

/**
 * Optional end-to-end transport checks: run a real Python agent without OpenAI
 * credentials, set TEST_AGENT_URL to its base URL, and TEST_DATABASE_URL to a
 * disposable PostgreSQL database. createTestStore creates and drops only the
 * suite's isolated schema. No external model calls or paid requests are needed.
 */
describe.skipIf(!process.env.TEST_AGENT_URL)("API → live Python agent", () => {
	let app: ReturnType<typeof createApp>["app"];
	let cleanup: (() => Promise<void>) | undefined;
	let employeeCookie: string;
	let hrCookie: string;
	const config = {
		...readConfig({}),
		agentUrl: process.env.TEST_AGENT_URL!,
		hrPassword: "agent-test-hr-password-only",
		credentialSecret: "agent-test-secret-only-".repeat(3),
		demoEmployeePassword: "agent-test-employee-password-only",
		demoEmployeeId: "E0005",
	};

	async function request(
		path: string,
		options: { method?: string; body?: unknown; cookie?: string } = {},
	) {
		const headers = new Headers();
		if (options.cookie) headers.set("cookie", options.cookie);
		if (options.body !== undefined)
			headers.set("content-type", "application/json");
		return app.handle(
			new Request(`http://localhost${path}`, {
				method: options.method ?? "GET",
				headers,
				body: options.body === undefined ? undefined : JSON.stringify(options.body),
			}),
		);
	}

	async function json<T>(
		path: string,
		options: Parameters<typeof request>[1] = {},
	): Promise<T> {
		const response = await request(path, options);
		expect(response.status).toBe(200);
		return response.json() as Promise<T>;
	}

	async function login(username: string, password: string) {
		const response = await request("/api/auth/login", {
			method: "POST",
			body: { username, password },
		});
		expect(response.status).toBe(200);
		const cookie = response.headers.get("set-cookie");
		expect(cookie).toContain("HttpOnly");
		return cookie!.split(";")[0]!;
	}

	beforeAll(async () => {
		const database = await createTestStore();
		cleanup = database.close;
		await database.store.seed(
			await loadDataset(resolve(import.meta.dir, "../../../case_1/career_quest_dataset")),
		);
		const created = createApp(database.store, config);
		app = created.app;
		await created.auth.bootstrap();
		employeeCookie = await login("E0005", config.demoEmployeePassword);
		hrCookie = await login("hr", config.hrPassword);
	}, 30_000);

	afterAll(async () => {
		await cleanup?.();
	});

	test("health, recommendations and plan use the live agent with current profile skills", async () => {
		const health = await json<{
			status: string; agent_available: boolean; ai_configured: boolean;
		}>("/api/health");
		expect(health).toEqual({
			status: "ok",
			agent_available: true,
			ai_configured: false,
		});
		const profile = await json<Profile>("/api/employees/E0005", { cookie: employeeCookie });
		const recommendations = await json<Recommendations>("/api/employees/E0005/recommendations", {
			method: "POST", body: {}, cookie: employeeCookie,
		});
		expect(recommendations.mode).toBe("rules");
		expect(recommendations.message.startsWith("Расчетный режим API")).toBe(false);
		expect(recommendations.recommendations.length).toBeGreaterThan(0);
		expect(recommendations.recommendations.length).toBeLessThanOrEqual(3);
		for (const recommendation of recommendations.recommendations) {
			expect(recommendation.event.mandatory).toBe(false);
			expect(new Set(recommendation.factors.map((factor) => factor.category)).size)
				.toBeGreaterThanOrEqual(3);
		}
		const plan = await json<Plan>("/api/employees/E0005/plan", { cookie: employeeCookie });
		expect(plan.employee_id).toBe("E0005");
		expect(plan.as_of_date).toBe("2026-10-01");
		expect(plan.effective_skills).toEqual(profile.effective_skills);
		expect(plan.career_goal).toEqual(profile.target);
	});

	test("chat returns the employee's plan and actual agent recommendations", async () => {
		const chat = await json<ChatResponse>("/api/employees/E0005/chat", {
			method: "POST",
			cookie: employeeCookie,
			body: {
				message: "Какой следующий шаг поможет моей карьерной цели?",
				conversation_history: [
					{ role: "user", content: "Хочу развивать навыки" },
					{ role: "assistant", content: "Посмотрим на карьерную цель" },
				],
			},
		});
		expect(chat.employee_id).toBe("E0005");
		expect(chat.plan.employee_id).toBe("E0005");
		expect(chat.reply.length).toBeGreaterThan(0);
		expect(chat.recommendations.mode).toBe("rules");
		expect(chat.recommendations.message.startsWith("Расчетный режим API")).toBe(false);
		expect(chat.plan.recommendations).toEqual(chat.recommendations.recommendations);
		const profile = await json<Profile>("/api/employees/E0005", { cookie: employeeCookie });
		expect(chat.plan.effective_skills).toEqual(profile.effective_skills);
	});

	test("completion updates agent plan skills once and repeated completion is idempotent", async () => {
		const before = await json<Plan>("/api/employees/E0005/plan", { cookie: employeeCookie });
		const step = before.recommendations[0];
		expect(step).toBeDefined();
		const path = `/api/employees/E0005/activities/${step!.event.event_id}/complete`;
		const first = await json<{ profile: Profile; already_completed: boolean }>(path, {
			method: "POST", body: {}, cookie: employeeCookie,
		});
		expect(first.already_completed).toBe(false);
		const after = await json<Plan>("/api/employees/E0005/plan", { cookie: employeeCookie });
		expect(after.effective_skills).toEqual(first.profile.effective_skills);
		expect(step!.gains.some((gain) =>
			(after.effective_skills[gain.skill_id] ?? 0) > (before.effective_skills[gain.skill_id] ?? 0),
		)).toBe(true);
		expect(after.recommendations.some((item) => item.event.event_id === step!.event.event_id)).toBe(false);
		const repeated = await json<{ profile: Profile; already_completed: boolean }>(path, {
			method: "POST", body: {}, cookie: employeeCookie,
		});
		expect(repeated.already_completed).toBe(true);
		expect(repeated.profile.effective_skills).toEqual(first.profile.effective_skills);
		const repeatedPlan = await json<Plan>("/api/employees/E0005/plan", { cookie: employeeCookie });
		expect(repeatedPlan.effective_skills).toEqual(after.effective_skills);
		expect(repeatedPlan.counted_completions).toEqual(after.counted_completions);
	});

	test("HR import produces live plans for new Backend and QA profiles", async () => {
		const imported = await json<{ employees: number; history: number }>("/api/hr/import", {
			method: "POST",
			cookie: hrCookie,
			body: {
				employees_json: await Bun.file(resolve(import.meta.dir, "../../../examples/jury/employees.json")).text(),
				history_csv: await Bun.file(resolve(import.meta.dir, "../../../examples/jury/activity_history.csv")).text(),
			},
		});
		expect(imported).toMatchObject({ employees: 2, history: 6 });
		for (const id of ["JURY_BACKEND_ALPHA", "JURY_QA_BETA"]) {
			const profile = await json<Profile>(`/api/employees/${id}`, { cookie: hrCookie });
			const plan = await json<Plan>(`/api/employees/${id}/plan`, { cookie: hrCookie });
			expect(plan.employee_id).toBe(id);
			expect(plan.effective_skills).toEqual(profile.effective_skills);
			expect(plan.career_goal).toEqual(profile.target);
			if (id === "JURY_BACKEND_ALPHA")
				// Imported CSV has no completion timestamps; retain the reviewed level.
				expect(plan.effective_skills.SK_PYTHON).toBe(1);
			else
				expect(plan.uncovered_skills).toContain("SK_TEST_DESIGN");
		}
	});
});
