import { describe, expect, mock, test } from "bun:test";
import type { Dataset, Event, Recommendations } from "../src/contracts";
import { candidatesFor } from "../src/modules/employees/service";
import { careerContext, recommend } from "../src/modules/recommendations/service";

function fixture(): Dataset {
	const event = (id: string, duration: number): Event => ({
		event_id: id,
		title: `Development activity ${id}`,
		description: "Synthetic catalogue activity",
		type: "course",
		format: "self_paced",
		duration_hours: duration,
		mandatory: false,
		target_roles: ["Backend Engineer"],
		target_grades: ["Junior"],
		develops_skills: [{ skill_id: "SK_EXAMPLE", gain: 1, max_level: 5 }],
		prerequisites: {},
		upcoming_sessions: [],
	});
	return {
		as_of_date: "2026-10-01",
		employees: [
			{
				employee_id: "NEW_PRIVATE_EMPLOYEE",
				full_name: "PRIVATE_FULL_NAME",
				department: "PRIVATE_DEPARTMENT",
				role: "Backend Engineer",
				grade: "Junior",
				manager_id: "PRIVATE_MANAGER",
				hire_date: "2025-01-02",
				tenure_months: 21,
				work_format: "remote",
				preferred_language: "ru",
				career_goal: {
					target_role: "Backend Engineer",
					target_grade: "Middle",
				},
				skills: { SK_EXAMPLE: 1 },
				last_review_date: "2026-09-01",
			},
		],
		skills: [
			{
				skill_id: "SK_EXAMPLE",
				name: "Example skill",
				type: "hard",
				category: "Engineering",
				description: "Synthetic skill",
			},
		],
		role_profiles: [
			{
				role: "Backend Engineer",
				grade: "Middle",
				required_skills: { SK_EXAMPLE: 4 },
				critical_skills: ["SK_EXAMPLE"],
			},
		],
		events: [
			event("COURSE_A", 4),
			event("COURSE_B", 3),
			event("COURSE_C", 2),
			event("COURSE_D", 1),
			{ ...event("MANDATORY_EVENT", 1), mandatory: true },
			event("ALREADY_COMPLETED", 1),
		],
		history: [
			{
				record_id: "PRIVATE_HISTORY_ID",
				employee_id: "NEW_PRIVATE_EMPLOYEE",
				event_id: "ALREADY_COMPLETED",
				date: "2026-08-01",
				due_date: null,
				status: "completed",
				completion_pct: 100,
				score: null,
				feedback_rating: null,
				assigned_by: "self",
			},
		],
	};
}

function agentResponse(data: Dataset): Recommendations {
	return {
		mode: "ai", model: "test-model", message: "План агента",
		recommendations: candidatesFor(data, data.employees[0]!.employee_id).slice(0, 2).map((candidate) => ({
			...candidate, explanation: candidate.factors.map((factor) => factor.text).join(" "),
		})),
		generated_at: "2026-09-23T12:00:00Z", duration_ms: 2,
	};
}
function transport(body: unknown, status = 200) {
	return mock(async () => Response.json(body, { status })) as unknown as typeof fetch;
}
const agentUrl = "http://agent:8000";

describe("Python agent integration", () => {
	test("uses agent choices, mode, model and explanations", async () => {
		const data = fixture();
		const expected = agentResponse(data);
		expected.recommendations.reverse();
		const result = await recommend(data, data.employees[0]!.employee_id, { agentUrl, fetch: transport(expected) });
		expect(result).toEqual({ ...expected, duration_ms: expect.any(Number) });
	});
	test("sends only the authorized employee's snapshot and history", async () => {
		const data = fixture();
		data.employees.push({ ...data.employees[0]!, employee_id: "OTHER_EMPLOYEE" });
		data.history.push({ ...data.history[0]!, record_id: "OTHER_HISTORY", employee_id: "OTHER_EMPLOYEE" });
		data.history[0]!.completed_at = "2026-09-10T12:00:00Z";
		let url: unknown;
		let init: RequestInit | undefined;
		const fetch = mock(async (input: unknown, options?: RequestInit) => {
			url = input; init = options;
			return Response.json(agentResponse(data));
		}) as unknown as typeof globalThis.fetch;
		await recommend(data, data.employees[0]!.employee_id, { agentUrl, fetch });
		expect(url).toBe("http://agent:8000/api/v1/advisor/recommendations");
		expect(init?.method).toBe("POST");
		expect(init?.signal).toBeInstanceOf(AbortSignal);
		expect(init?.redirect).toBe("error");
		expect(new Headers(init?.headers).has("authorization")).toBe(false);
		const serialized = String(init?.body);
		for (const value of ["OTHER_EMPLOYEE", "OTHER_HISTORY", "PRIVATE_FULL_NAME", "PRIVATE_DEPARTMENT", "PRIVATE_MANAGER"])
			expect(serialized).not.toContain(value);
		const { context } = JSON.parse(serialized);
		expect(context.as_of_date).toBe(data.as_of_date);
		expect(context.employee.skills).toEqual({ SK_EXAMPLE: 1 });
		expect(context.employee.last_review_date).toBe("2026-09-01");
		expect(context.activity_history).toEqual([data.history[0]]);
		expect(context.events).toEqual(data.events);
	});
	test("preserves agent rules fallback", async () => {
		const data = fixture();
		const response = { ...agentResponse(data), mode: "rules", model: null, message: "AI-подбор сейчас недоступен." };
		const result = await recommend(data, data.employees[0]!.employee_id, { agentUrl, fetch: transport(response) });
		expect(result.message).toBe(response.message);
		expect(result.mode).toBe("rules");
	});
	test("disabled agent uses the API fallback without network", async () => {
		const data = fixture();
		const fetch = transport({});
		const result = await recommend(data, data.employees[0]!.employee_id, { fetch });
		expect(fetch).not.toHaveBeenCalled();
		expect(result.mode).toBe("rules");
		expect(result.recommendations).toHaveLength(3);
		expect(result.message).toContain("Расчетный режим API");
		for (const item of result.recommendations) {
			expect(item.event.mandatory).toBe(false);
			expect(new Set(item.factors.map((factor) => factor.category)).size).toBeGreaterThanOrEqual(3);
		}
	});
	const invalidCases: [string, (response: Recommendations, data: Dataset) => unknown][] = [
		["malformed shape", () => ({ reply: "bad" })],
		["unknown event", (body) => { body.recommendations[0]!.event.event_id = "INVENTED"; return body; }],
		["mandatory event", (body, data) => { body.recommendations[0]!.event = data.events.find((e) => e.mandatory)!; return body; }],
		["completed event", (body, data) => { body.recommendations[0]!.event = data.events.find((e) => e.event_id === "ALREADY_COMPLETED")!; return body; }],
		["altered event", (body) => { body.recommendations[0]!.event.title = "Changed"; return body; }],
		["duplicate events", (body) => { body.recommendations.push(body.recommendations[0]!); return body; }],
		["too many events", (body) => { body.recommendations.push(...body.recommendations); return body; }],
		["missing factors", (body) => { body.recommendations[0]!.factors = []; return body; }],
		["invented explanation", (body) => { body.recommendations[0]!.explanation = "Unverified"; return body; }],
	];
	for (const [name, mutate] of invalidCases) test(`rejects ${name}`, async () => {
		const data = fixture();
		const response = mutate(structuredClone(agentResponse(data)), data);
		const result = await recommend(data, data.employees[0]!.employee_id, { agentUrl, fetch: transport(response) });
		expect(result.mode).toBe("rules");
		expect(result.message).toContain("не прошел проверку");
		expect(result.recommendations[0]!.event.event_id).toBe("COURSE_D");
	});
	for (const status of [422, 500, 503]) test(`does not disclose agent ${status} bodies`, async () => {
		const data = fixture();
		const result = await recommend(data, data.employees[0]!.employee_id, { agentUrl, fetch: transport({ detail: "PRIVATE_PROVIDER_ERROR" }, status) });
		expect(result.mode).toBe("rules");
		expect(JSON.stringify(result)).not.toContain("PRIVATE_PROVIDER_ERROR");
	});
	test("deadline covers fetch and slow body even if abort is ignored", async () => {
		for (const slowBody of [false, true]) {
			const data = fixture();
			let signal: AbortSignal | undefined;
			const fetch = mock(async (_url: unknown, init?: RequestInit) => {
				signal = init?.signal as AbortSignal;
				if (!slowBody) return new Promise<Response>(() => {});
				return { ok: true, json: () => new Promise(() => {}) } as Response;
			}) as unknown as typeof globalThis.fetch;
			const start = performance.now();
			const result = await recommend(data, data.employees[0]!.employee_id, { agentUrl, fetch, timeoutMs: 10 });
			expect(result.mode).toBe("rules");
			expect(result.message).toContain("не ответил");
			expect(signal?.aborted).toBe(true);
			expect(performance.now() - start).toBeLessThan(500);
		}
	});
	test("unknown employee fails before any agent request", async () => {
		const fetch = transport({});
		await expect(recommend(fixture(), "UNKNOWN", { agentUrl, fetch })).rejects.toThrow("Сотрудник не найден");
		expect(fetch).not.toHaveBeenCalled();
	});
	test("context reflects new goals and completions without pre-applying gains", () => {
		const data = fixture();
		data.employees[0]!.career_goal = null;
		data.history[0]!.completed_at = "2026-09-28T12:00:00Z";
		const context = careerContext(data, data.employees[0]!.employee_id);
		expect(context.employee.career_goal).toBeNull();
		expect(context.employee.skills.SK_EXAMPLE).toBe(1);
		expect(context.activity_history[0]!.completed_at).toBe("2026-09-28T12:00:00Z");
	});
});
