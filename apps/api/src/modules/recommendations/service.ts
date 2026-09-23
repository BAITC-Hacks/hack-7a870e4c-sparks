import { Value } from "@sinclair/typebox/value";
import { t } from "elysia";
import type { Static, TSchema } from "@sinclair/typebox";
import { isDeepStrictEqual } from "node:util";
import type { Dataset, Recommendation, Recommendations } from "../../contracts";
import type { Store } from "../../utils/db";
import type { AppConfig } from "../../utils/config";
import { HttpError } from "../../utils/http";
import { candidatesFor, noStepReason, profileFor } from "../employees/service";
import * as Models from "./model";

export type RecommendationOptions = {
	agentUrl?: string;
	fetch?: typeof fetch;
	timeoutMs?: number;
};

const MAX_TIMEOUT_MS = 9_000;
class AgentUnavailable extends Error {}
class InvalidAgentOutput extends Error {}
class AgentTimeout extends Error {}

/** Only the authorized employee and their original skill snapshot/history leave the API. */
export function careerContext(dataset: Dataset, id: string) {
	const employee = dataset.employees.find((item) => item.employee_id === id);
	if (!employee) throw new HttpError(404, "Сотрудник не найден.");
	return {
		as_of_date: dataset.as_of_date,
		employee: {
			employee_id: employee.employee_id,
			role: employee.role,
			grade: employee.grade,
			tenure_months: employee.tenure_months,
			work_format: employee.work_format,
			preferred_language: employee.preferred_language,
			career_goal: employee.career_goal,
			skills: employee.skills,
			last_review_date: employee.last_review_date,
		},
		skills: dataset.skills,
		role_profiles: dataset.role_profiles,
		events: dataset.events,
		activity_history: dataset.history.filter((row) => row.employee_id === id),
	};
}

async function agentRequest<S extends TSchema>(
	path: string,
	body: unknown,
	schema: S,
	options: RecommendationOptions,
): Promise<Static<S>> {
	if (!options.agentUrl) throw new AgentUnavailable();
	const timeout = Number.isFinite(options.timeoutMs)
		? Math.max(1, Math.min(MAX_TIMEOUT_MS, Math.trunc(options.timeoutMs!)))
		: MAX_TIMEOUT_MS;
	const abort = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const deadline = new Promise<never>((_, reject) => {
			timer = setTimeout(() => {
				reject(new AgentTimeout());
				abort.abort();
			}, timeout);
		});
		const request = async () => {
			const response = await (options.fetch ?? globalThis.fetch)(
				`${options.agentUrl!.replace(/\/$/, "")}${path}`,
				{
					method: body === undefined ? "GET" : "POST",
					headers: body === undefined ? undefined : { "Content-Type": "application/json" },
					body: body === undefined ? undefined : JSON.stringify(body),
					signal: abort.signal,
					redirect: "error",
				},
			);
			if (!response.ok) throw new AgentUnavailable();
			const result: unknown = await response.json();
			if (!Value.Check(schema, result)) throw new InvalidAgentOutput();
			return result as Static<S>;
		};
		// Also bounds body reading and transports which ignore AbortSignal.
		return await Promise.race([request(), deadline]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

function validateRecommendations(items: Recommendation[], dataset: Dataset, id: string) {
	const eligible = new Map(candidatesFor(dataset, id).map((item) => [item.event.event_id, item]));
	const seen = new Set<string>();
	for (const item of items) {
		const candidate = eligible.get(item.event.event_id);
		if (!candidate || seen.has(item.event.event_id) || !isDeepStrictEqual(candidate.event, item.event))
			throw new InvalidAgentOutput();
		seen.add(item.event.event_id);
		const categories = new Set(item.factors.map((factor) => factor.category));
		if (categories.size < 3 || categories.size !== item.factors.length ||
			item.factors.some((factor) => factor.id !== `${item.event.event_id}:${factor.category}`) ||
			item.explanation !== item.factors.map((factor) => factor.text).join(" "))
			throw new InvalidAgentOutput();
	}
}

function failureReason(error: unknown): string {
	if (error instanceof AgentTimeout) return "Карьерный агент не ответил в отведенное время.";
	if (error instanceof InvalidAgentOutput) return "Ответ карьерного агента не прошел проверку.";
	return "Карьерный агент недоступен.";
}

export async function agentHealth(agentUrl: string) {
	try {
		const health = await agentRequest("/health", undefined, t.Object({
			status: t.Literal("ok"), ai_configured: t.Boolean(),
		}), { agentUrl, timeoutMs: 1_000 });
		return { agent_available: true, ai_configured: health.ai_configured };
	} catch {
		return { agent_available: false, ai_configured: false };
	}
}

export async function recommend(dataset: Dataset, id: string, options: RecommendationOptions = {}): Promise<Recommendations> {
	const started = performance.now();
	const context = careerContext(dataset, id);
	try {
		const response = await agentRequest("/api/v1/advisor/recommendations", { context }, Models.Recommendations, options);
		validateRecommendations(response.recommendations, dataset, id);
		return { ...response, duration_ms: Math.round(performance.now() - started) };
	} catch (error) {
		const candidates = candidatesFor(dataset, id);
		return {
			mode: "rules",
			model: null,
			message: `Расчетный режим API. ${failureReason(error)} ${candidates.length ? "Шаги выбраны по проверенным правилам и разрывам навыков." : noStepReason(dataset, profileFor(dataset, id))}`,
			recommendations: candidates.slice(0, 3).map((candidate) => ({
				...candidate,
				explanation: candidate.factors.map((factor) => factor.text).join(" "),
			})),
			generated_at: new Date().toISOString(),
			duration_ms: Math.round(performance.now() - started),
		};
	}
}

export class RecommendationsService {
	constructor(private store: Store, private config: AppConfig) {}

	async forEmployee(id: string) {
		return recommend(await this.store.readDataset(), id, { agentUrl: this.config.agentUrl });
	}

	async planForEmployee(id: string): Promise<Static<typeof Models.Plan>> {
		const data = await this.store.readDataset();
		const context = careerContext(data, id);
		try {
			const plan = await agentRequest("/api/v1/advisor/plan", { context }, Models.Plan, { agentUrl: this.config.agentUrl });
			if (plan.employee_id !== id || plan.as_of_date !== data.as_of_date) throw new InvalidAgentOutput();
			validateRecommendations(plan.recommendations, data, id);
			return plan;
		} catch (error) {
			throw new HttpError(503, failureReason(error));
		}
	}

	async chatForEmployee(id: string, input: Static<typeof Models.ChatInput>): Promise<Static<typeof Models.ChatResponse>> {
		const data = await this.store.readDataset();
		const context = careerContext(data, id);
		try {
			const response = await agentRequest("/api/v1/advisor/chat", {
				context,
				message: input.message,
				conversation_history: input.conversation_history ?? [],
			}, Models.ChatResponse, { agentUrl: this.config.agentUrl });
			if (response.employee_id !== id || response.plan.employee_id !== id || response.plan.as_of_date !== data.as_of_date)
				throw new InvalidAgentOutput();
			validateRecommendations(response.recommendations.recommendations, data, id);
			validateRecommendations(response.plan.recommendations, data, id);
			return response;
		} catch (error) {
			throw new HttpError(503, failureReason(error));
		}
	}
}
