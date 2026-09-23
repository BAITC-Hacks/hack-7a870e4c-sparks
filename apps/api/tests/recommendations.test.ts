import { describe, expect, mock, test } from "bun:test";
import type { Candidate, Dataset, Event } from "../src/contracts";
import { candidatesFor } from "../src/modules/employees/service";
import { recommend } from "../src/modules/recommendations/service";

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

function selection(candidate: Candidate) {
	return {
		event_id: candidate.event.event_id,
		factor_ids: candidate.factors.slice(0, 3).map((factor) => factor.id),
	};
}

function responseBody(value: unknown) {
	return {
		status: "completed",
		output: [
			{
				type: "message",
				role: "assistant",
				status: "completed",
				content: [{ type: "output_text", text: JSON.stringify(value) }],
			},
		],
	};
}

function transport(body: unknown, status = 200) {
	return mock(async () =>
		Response.json(body, { status }),
	) as unknown as typeof fetch;
}

describe("career recommendations", () => {
	test("without an API key, returns the top three eligible rule-based steps with verified explanations", async () => {
		const data = fixture();
		const fetch = transport({});
		const result = await recommend(data, data.employees[0]!.employee_id, {
			apiKey: "",
			fetch,
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(result.mode).toBe("rules");
		expect(result.model).toBeNull();
		expect(result.message).toContain("Ключ OpenAI не настроен");
		expect(result.recommendations.map((item) => item.event.event_id)).toEqual([
			"COURSE_D",
			"COURSE_C",
			"COURSE_B",
		]);
		for (const recommendation of result.recommendations) {
			expect(
				new Set(recommendation.factors.map((factor) => factor.category)).size,
			).toBeGreaterThanOrEqual(3);
			expect(recommendation.explanation).toBe(
				recommendation.factors.map((factor) => factor.text).join(" "),
			);
			expect(recommendation.event.mandatory).toBe(false);
		}
		expect(result.duration_ms).toBeGreaterThanOrEqual(0);
		expect(Number.isNaN(Date.parse(result.generated_at))).toBe(false);
	});

	test("validates model choices and derives explanations solely from selected facts", async () => {
		const data = fixture();
		const candidates = candidatesFor(data, data.employees[0]!.employee_id);
		const selected = [selection(candidates[2]!), selection(candidates[0]!)];
		const fetch = transport(responseBody({ recommendations: selected }));
		const result = await recommend(data, data.employees[0]!.employee_id, {
			apiKey: "test-key",
			model: "test-model",
			fetch,
		});
		expect(result.mode).toBe("ai");
		expect(result.model).toBe("test-model");
		expect(result.recommendations.map((item) => item.event.event_id)).toEqual(
			selected.map((item) => item.event_id),
		);
		expect(
			result.recommendations[0]!.factors.map((factor) => factor.id),
		).toEqual(selected[0]!.factor_ids);
		expect(result.recommendations[0]!.explanation).toBe(
			candidates[2]!.factors
				.slice(0, 3)
				.map((factor) => factor.text)
				.join(" "),
		);
	});

	test("sends only allowed profile fields and eligible candidates with Responses Structured Outputs and store:false", async () => {
		const data = fixture();
		const candidate = candidatesFor(data, data.employees[0]!.employee_id)[0]!;
		let capturedUrl: unknown;
		let capturedInit: RequestInit | undefined;
		const fetch = mock(async (url: unknown, init?: RequestInit) => {
			capturedUrl = url;
			capturedInit = init;
			return Response.json(
				responseBody({ recommendations: [selection(candidate)] }),
			);
		}) as unknown as typeof globalThis.fetch;
		const result = await recommend(data, data.employees[0]!.employee_id, {
			apiKey: "test-key",
			model: "test-model",
			fetch,
		});
		expect(result.mode).toBe("ai");
		expect(capturedUrl).toBe("https://api.openai.com/v1/responses");
		expect(capturedInit?.method).toBe("POST");
		expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
		const bodyText = String(capturedInit?.body);
		for (const privateValue of [
			"NEW_PRIVATE_EMPLOYEE",
			"PRIVATE_FULL_NAME",
			"PRIVATE_DEPARTMENT",
			"PRIVATE_MANAGER",
			"PRIVATE_HISTORY_ID",
			"test-key",
			"MANDATORY_EVENT",
			"ALREADY_COMPLETED",
		]) {
			expect(bodyText).not.toContain(privateValue);
		}
		const body = JSON.parse(bodyText);
		expect(body.store).toBe(false);
		expect(body.model).toBe("test-model");
		expect(body.text.format.type).toBe("json_schema");
		expect(body.text.format.strict).toBe(true);
		expect(body.text.format.schema.additionalProperties).toBe(false);
		const input = JSON.parse(body.input[0].content);
		expect(Object.keys(input).sort()).toEqual([
			"candidates",
			"gaps",
			"grade",
			"role",
			"target",
		]);
		expect(input.candidates).toHaveLength(4);
	});

	const invalidCases: [string, (candidates: Candidate[]) => unknown][] = [
		[
			"unknown activity",
			(items) => ({
				recommendations: [{ ...selection(items[0]!), event_id: "INVENTED" }],
			}),
		],
		[
			"mandatory activity",
			(items) => ({
				recommendations: [
					{ ...selection(items[0]!), event_id: "MANDATORY_EVENT" },
				],
			}),
		],
		[
			"already completed activity",
			(items) => ({
				recommendations: [
					{ ...selection(items[0]!), event_id: "ALREADY_COMPLETED" },
				],
			}),
		],
		[
			"duplicate activities",
			(items) => ({
				recommendations: [selection(items[0]!), selection(items[0]!)],
			}),
		],
		[
			"more than three activities",
			(items) => ({ recommendations: items.map(selection) }),
		],
		[
			"no activities despite eligible candidates",
			() => ({ recommendations: [] }),
		],
		[
			"factor from another activity",
			(items) => ({
				recommendations: [
					{
						...selection(items[0]!),
						factor_ids: [
							items[1]!.factors[0]!.id,
							...items[0]!.factors.slice(1, 3).map((factor) => factor.id),
						],
					},
				],
			}),
		],
		[
			"unknown factor",
			(items) => ({
				recommendations: [
					{
						...selection(items[0]!),
						factor_ids: [...selection(items[0]!).factor_ids, "invented-factor"],
					},
				],
			}),
		],
		[
			"duplicate factors",
			(items) => ({
				recommendations: [
					{
						...selection(items[0]!),
						factor_ids: [
							...selection(items[0]!).factor_ids,
							items[0]!.factors[0]!.id,
						],
					},
				],
			}),
		],
		[
			"fewer than three categories",
			(items) => ({
				recommendations: [
					{
						...selection(items[0]!),
						factor_ids: items[0]!.factors
							.slice(0, 2)
							.map((factor) => factor.id),
					},
				],
			}),
		],
		[
			"free-form model explanation",
			(items) => ({
				recommendations: [
					{ ...selection(items[0]!), explanation: "A promotion is guaranteed" },
				],
			}),
		],
		[
			"extra top-level output",
			(items) => ({
				recommendations: [selection(items[0]!)],
				message: "Unverified claim",
			}),
		],
		["wrong selection shape", () => ({ recommendations: [null] })],
		[
			"wrong factor type",
			(items) => ({
				recommendations: [
					{ ...selection(items[0]!), factor_ids: [null, true, 3] },
				],
			}),
		],
		["wrong root shape", () => null],
	];
	for (const [name, invalid] of invalidCases) {
		test(`falls back if the model returns ${name}`, async () => {
			const data = fixture();
			const candidates = candidatesFor(data, data.employees[0]!.employee_id);
			const result = await recommend(data, data.employees[0]!.employee_id, {
				apiKey: "test-key",
				fetch: transport(responseBody(invalid(candidates))),
			});
			expect(result.mode).toBe("rules");
			expect(result.model).toBeNull();
			expect(result.message).toContain("не прошел проверку");
			expect(result.recommendations.map((item) => item.event.event_id)).toEqual(
				candidates.slice(0, 3).map((item) => item.event.event_id),
			);
		});
	}

	test("does not accept an incomplete response even when the text happens to contain valid JSON", async () => {
		const data = fixture();
		const body = responseBody({
			recommendations: [
				selection(candidatesFor(data, data.employees[0]!.employee_id)[0]!),
			],
		});
		body.status = "incomplete";
		const result = await recommend(data, data.employees[0]!.employee_id, {
			apiKey: "test-key",
			fetch: transport(body),
		});
		expect(result.mode).toBe("rules");
		expect(result.message).toContain("не прошел проверку");
	});

	test("handles refusal and malformed JSON as invalid output", async () => {
		const data = fixture();
		for (const content of [
			[{ type: "refusal", refusal: "A private provider message" }],
			[{ type: "output_text", text: "{invalid json" }],
		]) {
			const fetch = transport({
				status: "completed",
				output: [
					{ type: "message", role: "assistant", status: "completed", content },
				],
			});
			const result = await recommend(data, data.employees[0]!.employee_id, {
				apiKey: "test-key",
				fetch,
			});
			expect(result.mode).toBe("rules");
			expect(result.message).toContain("не прошел проверку");
			expect(result.message).not.toContain("private provider");
		}
	});

	test("does not expose HTTP or network error details", async () => {
		const data = fixture();
		const failure = mock(async () => {
			throw new Error("SECRET_PROVIDER_ERROR");
		}) as unknown as typeof fetch;
		for (const fetch of [
			transport({ error: { message: "SECRET_PROVIDER_ERROR" } }, 429),
			failure,
		]) {
			const result = await recommend(data, data.employees[0]!.employee_id, {
				apiKey: "test-key",
				fetch,
			});
			expect(result.mode).toBe("rules");
			expect(result.message).toContain("OpenAI недоступен");
			expect(JSON.stringify(result)).not.toContain("SECRET_PROVIDER_ERROR");
		}
	});

	test("times out and aborts even if a transport ignores the abort signal", async () => {
		const data = fixture();
		let signal: AbortSignal | null | undefined;
		const fetch = mock(async (_url: unknown, init?: RequestInit) => {
			signal = init?.signal;
			return await new Promise<Response>(() => {});
		}) as unknown as typeof globalThis.fetch;
		const start = performance.now();
		const result = await recommend(data, data.employees[0]!.employee_id, {
			apiKey: "test-key",
			fetch,
			timeoutMs: 15,
		});
		expect(result.mode).toBe("rules");
		expect(result.message).toContain("не ответил в отведенное время");
		expect(signal?.aborted).toBe(true);
		expect(performance.now() - start).toBeLessThan(1_000);
	});

	test("the deadline also covers a response whose body never finishes", async () => {
		const data = fixture();
		const response = new Response("body");
		response.json = async () => await new Promise(() => {});
		const fetch = mock(
			async () => response,
		) as unknown as typeof globalThis.fetch;
		const result = await recommend(data, data.employees[0]!.employee_id, {
			apiKey: "test-key",
			fetch,
			timeoutMs: 15,
		});
		expect(result.mode).toBe("rules");
		expect(result.message).toContain("не ответил в отведенное время");
	});

	test("explains an empty candidate set and skips the provider", async () => {
		const data = fixture();
		data.employees[0]!.grade = "Lead";
		data.employees[0]!.career_goal = null;
		const fetch = transport({});
		const result = await recommend(data, data.employees[0]!.employee_id, {
			apiKey: "test-key",
			fetch,
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(result.mode).toBe("rules");
		expect(result.recommendations).toEqual([]);
		expect(result.message).toContain("цель");
	});

	test("unknown employees remain domain errors rather than AI fallback successes", async () => {
		const data = fixture();
		const fetch = transport({});
		await expect(
			recommend(data, "NOT_FOUND", { apiKey: "test-key", fetch }),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});
});
