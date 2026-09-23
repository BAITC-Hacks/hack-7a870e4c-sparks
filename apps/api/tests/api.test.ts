import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { createTestStore } from "./database";
import { Store } from "../src/utils/db";
import { createApp } from "../src/app";
import { readConfig } from "../src/utils/config";
import { loadDataset } from "../src/utils/dataset";

let cleanup: (() => Promise<void>) | undefined;
let store: Store;
let app: ReturnType<typeof createApp>["app"];
let employeeCookie: string;
let hrCookie: string;
const config = {
	...readConfig({}),
	hrPassword: "test-hr-password-only",
	credentialSecret: "test-secret-only-".repeat(3),
	demoEmployeePassword: "test-employee-password-only",
	demoEmployeeId: "E0005",
};
const datasetPath = resolve(
	import.meta.dir,
	"../../../case_1/career_quest_dataset",
);

async function request(
	path: string,
	options: {
		method?: string;
		body?: unknown;
		cookie?: string;
		origin?: string;
	} = {},
) {
	const headers = new Headers();
	if (options.cookie) headers.set("cookie", options.cookie);
	if (options.origin) headers.set("origin", options.origin);
	if (options.body !== undefined)
		headers.set("content-type", "application/json");
	return app.handle(
		new Request(`http://localhost${path}`, {
			method: options.method || "GET",
			headers,
			body:
				options.body === undefined ? undefined : JSON.stringify(options.body),
		}),
	);
}
async function login(username: string, password: string) {
	const response = await request("/api/auth/login", {
		method: "POST",
		body: { username, password },
	});
	expect(response.status).toBe(200);
	const cookie = response.headers.get("set-cookie")!;
	expect(cookie).toContain("HttpOnly");
	expect(cookie).toContain("SameSite=Lax");
	return cookie.split(";")[0]!;
}
beforeAll(async () => {
	const database = await createTestStore();
	store = database.store;
	cleanup = database.close;
	await store.seed(await loadDataset(datasetPath));
	const created = createApp(store, config);
	app = created.app;
	await created.auth.bootstrap();
	employeeCookie = await login("E0005", config.demoEmployeePassword);
	hrCookie = await login("hr", config.hrPassword);
}, 30000);
afterAll(async () => {
	await cleanup?.();
});

describe("Career Quest HTTP API", () => {
	test("health checks a real migrated Prisma database", async () => {
		const response = await request("/api/health");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "ok",
			ai_configured: false,
		});
	});
	test("complete schemas and cookie auth are published as OpenAPI JSON", async () => {
		const response = await request("/api/openapi.json");
		expect(response.status).toBe(200);
		const document = await response.json();
		expect(document.openapi).toMatch(/^3\./);
		expect(Object.keys(document.paths)).toHaveLength(12);
		expect(document.components.securitySchemes.session).toMatchObject({
			in: "cookie",
			name: "career_quest_session",
		});
		const ids = new Set<string>();
		for (const [path, operations] of Object.entries(document.paths)) {
			for (const operation of Object.values(
				operations as Record<string, any>,
			)) {
				expect(operation.operationId).toBeString();
				expect(ids.has(operation.operationId)).toBe(false);
				ids.add(operation.operationId);
				expect(
					operation.responses["200"].content["application/json"].schema,
				).toBeDefined();
				expect(
					operation.responses["400"].content["application/json"].schema
						.properties.message.type,
				).toBe("string");
				if (!["/api/health", "/api/auth/login"].includes(path))
					expect(operation.security).toEqual([{ session: [] }]);
			}
		}
		expect(
			document.paths["/api/hr/overview"].get.responses["200"].content[
				"application/json"
			].schema.properties.total_employees.type,
		).toBe("integer");
		expect(document.paths["/api/auth/logout"].post.requestBody).toBeUndefined();
		const saved = await Bun.file(
			resolve(import.meta.dir, "../openapi.json"),
		).json();
		expect(document).toEqual(saved);
	});
	test("unknown sessions and wrong credentials fail; sessions reveal no hashes", async () => {
		expect((await request("/api/auth/session")).status).toBe(401);
		expect(
			(
				await request("/api/employees/E0005", {
					cookie: "career_quest_session=madeup",
				})
			).status,
		).toBe(401);
		const bad = await request("/api/auth/login", {
			method: "POST",
			body: { username: "hr", password: "wrong" },
		});
		expect(bad.status).toBe(401);
		expect(await bad.json()).toEqual({ message: "Неверный логин или пароль." });
		const session = await (
			await request("/api/auth/session", { cookie: employeeCookie })
		).json();
		expect(session).toEqual({
			username: "E0005",
			employee_id: "E0005",
			role: "employee",
			full_name: expect.any(String),
		});
	});
	test("employees cannot read or mutate other employees or HR resources", async () => {
		for (const [path, method, body] of [
			["/api/employees", "GET", undefined],
			["/api/employees/E0004", "GET", undefined],
			["/api/employees/E0004/goal", "PATCH", { goal: null }],
			["/api/employees/E0004/recommendations", "POST", {}],
			["/api/employees/E0004/activities/EV_007/complete", "POST", {}],
			["/api/hr/overview", "GET", undefined],
			["/api/hr/import", "POST", { employees_json: "", history_csv: "" }],
		] as const)
			expect(
				(await request(path, { method, body, cookie: employeeCookie })).status,
			).toBe(403);
	});
	test("cross-origin writes and malformed payloads are rejected", async () => {
		expect(
			(
				await request("/api/employees/E0005/goal", {
					method: "PATCH",
					body: { goal: null },
					cookie: employeeCookie,
					origin: "https://untrusted.example",
				})
			).status,
		).toBe(403);
		const invalid = await request("/api/employees/E0005/goal", {
			method: "PATCH",
			body: {
				goal: { target_role: "Backend Engineer", target_grade: "Intern" },
			},
			cookie: employeeCookie,
		});
		expect(invalid.status).toBe(400);
		expect(await invalid.json()).toHaveProperty("message");
		expect(
			(await request("/api/employees/missing", { cookie: hrCookie })).status,
		).toBe(404);
	});
	test("profile → recommendations → completion persists exactly one gain", async () => {
		const before = await (
			await request("/api/employees/E0005", { cookie: employeeCookie })
		).json();
		expect(before.employee.employee_id).toBe("E0005");
		const recommendationsResponse = await request(
			"/api/employees/E0005/recommendations",
			{ method: "POST", body: {}, cookie: employeeCookie },
		);
		expect(recommendationsResponse.status).toBe(200);
		const recommendations = await recommendationsResponse.json();
		expect(recommendations.mode).toBe("rules");
		expect(recommendations.recommendations.length).toBeGreaterThan(0);
		expect(recommendations.recommendations.length).toBeLessThanOrEqual(3);
		const candidate = recommendations.recommendations[0];
		expect(candidate.event.mandatory).toBe(false);
		expect(
			new Set(candidate.factors.map((x: any) => x.category)).size,
		).toBeGreaterThanOrEqual(3);
		const first = await request(
			`/api/employees/E0005/activities/${candidate.event.event_id}/complete`,
			{ method: "POST", body: {}, cookie: employeeCookie },
		);
		expect(first.status).toBe(200);
		const completed = await first.json();
		expect(completed.already_completed).toBe(false);
		expect(
			candidate.gains.some(
				(gain: any) =>
					completed.profile.effective_skills[gain.skill_id] >
					(before.effective_skills[gain.skill_id] || 0),
			),
		).toBe(true);
		const again = await (
			await request(
				`/api/employees/E0005/activities/${candidate.event.event_id}/complete`,
				{ method: "POST", body: {}, cookie: employeeCookie },
			)
		).json();
		expect(again.already_completed).toBe(true);
		expect(again.profile.effective_skills).toEqual(
			completed.profile.effective_skills,
		);
		expect(
			(
				await request("/api/employees/E0005/activities/EV_001/complete", {
					method: "POST",
					body: {},
					cookie: employeeCookie,
				})
			).status,
		).toBe(400);
	});
	test("goal updates and HR overview use the existing frontend contract", async () => {
		const result = await request("/api/employees/E0005/goal", {
			method: "PATCH",
			body: { goal: { target_role: "Backend Engineer", target_grade: "Lead" } },
			cookie: employeeCookie,
		});
		expect(result.status).toBe(200);
		expect((await result.json()).target.target_grade).toBe("Lead");
		const catalog = await (
			await request("/api/catalog", { cookie: employeeCookie })
		).json();
		expect(catalog.roles).toHaveLength(32);
		expect(catalog.skills).toHaveLength(60);
		expect(catalog.as_of_date).toBe("2026-10-01");
		const list = await (
			await request("/api/employees", { cookie: hrCookie })
		).json();
		expect(list.employees).toHaveLength(200);
		const overviewResponse = await request("/api/hr/overview", {
			cookie: hrCookie,
		});
		expect(overviewResponse.status).toBe(200);
		const overview = await overviewResponse.json();
		expect(overview.total_employees).toBe(200);
		expect(overview.participation).toHaveLength(40);
		const lead = await (
			await request("/api/employees/E0006", { cookie: hrCookie })
		).json();
		expect(lead.target).toBeNull();
	});
	test("jury import accepts new IDs, is idempotent and never grants accounts", async () => {
		const employees_json = await Bun.file(
			resolve(import.meta.dir, "../../../examples/jury/employees.json"),
		).text();
		const history_csv = await Bun.file(
			resolve(import.meta.dir, "../../../examples/jury/activity_history.csv"),
		).text();
		for (let i = 0; i < 2; i++) {
			const response = await request("/api/hr/import", {
				method: "POST",
				cookie: hrCookie,
				body: { employees_json, history_csv },
			});
			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({ employees: 2, history: 6 });
		}
		const imported = await (
			await request("/api/employees/JURY_BACKEND_ALPHA", { cookie: hrCookie })
		).json();
		expect(imported.effective_skills.SK_PYTHON).toBe(2);
		expect(
			await store.prisma.account.findUnique({
				where: { username: "JURY_BACKEND_ALPHA" },
			}),
		).toBeNull();
		const count = await store.prisma.employee.count();
		expect(count).toBe(202);
		const broken = JSON.parse(employees_json);
		broken.employees[0].skills.SK_UNKNOWN = 3;
		const response = await request("/api/hr/import", {
			method: "POST",
			cookie: hrCookie,
			body: { employees_json: JSON.stringify(broken), history_csv },
		});
		expect(response.status).toBe(400);
		expect(await store.prisma.employee.count()).toBe(count);
	});
	test("logout revokes only the current session and removes its cookie", async () => {
		const second = await login("E0005", config.demoEmployeePassword);
		const response = await request("/api/auth/logout", {
			method: "POST",
			body: {},
			cookie: second,
		});
		expect(response.status).toBe(200);
		expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
		expect(
			(await request("/api/auth/session", { cookie: second })).status,
		).toBe(401);
		expect(
			(await request("/api/auth/session", { cookie: employeeCookie })).status,
		).toBe(200);
	});
	test("expired server-side sessions cannot authorize requests", async () => {
		const isolated = await login("E0005", config.demoEmployeePassword);
		const token = isolated.split("=")[1]!;
		const hash = new Bun.CryptoHasher("sha256").update(token).digest("hex");
		await store.write((tx) =>
			tx.session.update({
				where: { tokenHash: hash },
				data: { expiresAt: new Date(0) },
			}),
		);
		expect(
			(await request("/api/auth/session", { cookie: isolated })).status,
		).toBe(401);
	});
});
