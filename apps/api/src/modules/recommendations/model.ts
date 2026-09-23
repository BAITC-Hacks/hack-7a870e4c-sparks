import { t } from "elysia";
import { object, nullable, integer } from "../../utils/http/model";
import { Goal, Grade } from "../employees/model";
const Level = integer({ minimum: 0, maximum: 5 });
const Levels = t.Record(t.String(), Level);
const DateString = t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" });
const Event = object({
	event_id: t.String(),
	title: t.String(),
	description: t.String(),
	type: t.String(),
	format: t.Union([
		t.Literal("online"),
		t.Literal("offline"),
		t.Literal("self_paced"),
	]),
	duration_hours: t.Number(),
	mandatory: t.Boolean(),
	target_roles: t.Array(t.String()),
	target_grades: t.Array(Grade),
	develops_skills: t.Array(
		object({ skill_id: t.String(), gain: t.Number(), max_level: Level }),
	),
	prerequisites: Levels,
	upcoming_sessions: t.Array(DateString),
});
const Recommendation = object({
	event: Event,
	score: t.Number(),
	factors: t.Array(
		object({
			id: t.String(),
			category: t.Union([
				t.Literal("grade"),
				t.Literal("gap"),
				t.Literal("history"),
				t.Literal("target"),
			]),
			text: t.String(),
		}),
	),
	next_session: nullable(DateString),
	gains: t.Array(
		object({
			skill_id: t.String(),
			name: t.String(),
			before: t.Number(),
			after: t.Number(),
			target: t.Number(),
		}),
	),
	in_progress: t.Boolean(),
	explanation: t.String(),
});
export const Recommendations = object({
	mode: t.Union([t.Literal("ai"), t.Literal("rules")]),
	model: nullable(t.String()),
	message: t.String(),
	recommendations: t.Array(Recommendation, { maxItems: 3 }),
	generated_at: t.String(),
	duration_ms: t.Number(),
});

const Readiness = t.Union([
	t.Number({ minimum: 0, maximum: 100 }),
	t.Null(),
]);

/** Public projection of agent.advisor.Advisor.plan(). */
export const Plan = object({
	employee_id: t.String(),
	current_position: object({ role: t.String(), grade: Grade }),
	career_goal: t.Union([Goal, t.Null()]),
	goal_source: t.Union([
		t.Literal("explicit"),
		t.Literal("next_grade"),
		t.Literal("none"),
	]),
	as_of_date: DateString,
	last_review_date: nullable(DateString),
	effective_skills: Levels,
	counted_completions: t.Array(t.String()),
	assessment_note: t.String(),
	readiness: Readiness,
	projected_readiness: Readiness,
	projected_skills: Levels,
	trajectory: t.Array(
		object({
			event_id: t.String(),
			readiness_before: Readiness,
			readiness_after: Readiness,
		}),
		{ maxItems: 3 },
	),
	gaps: t.Array(
		object({
			skill_id: t.String(),
			name: t.String(),
			current: Level,
			required: Level,
			gap: integer({ minimum: 1, maximum: 5 }),
			critical: t.Boolean(),
			covered: t.Boolean(),
		}),
	),
	recommendations: t.Array(Recommendation, { maxItems: 3 }),
	uncovered_skills: t.Array(t.String()),
	mandatory_tasks: t.Array(
		object({
			event_id: t.String(),
			title: t.String(),
			status: t.Union([
				t.Literal("in_progress"),
				t.Literal("dropped"),
				t.Literal("no_show"),
				t.Literal("declined"),
				t.Literal("overdue"),
			]),
			due_date: nullable(DateString),
		}),
	),
	warnings: t.Array(t.String()),
});
export type Plan = typeof Plan.static;

/** Context is read from the authenticated employee's server-side dataset. */
export const ChatInput = object({
	message: t.String({ minLength: 1, maxLength: 3_000 }),
	conversation_history: t.Optional(
		t.Array(
			object({
				role: t.Union([t.Literal("user"), t.Literal("assistant")]),
				content: t.String({ minLength: 1, maxLength: 3_000 }),
			}),
			{ maxItems: 20 },
		),
	),
});
export type ChatInput = typeof ChatInput.static;

export const ChatResponse = object({
	employee_id: t.String(),
	reply: t.String(),
	plan: Plan,
	recommendations: Recommendations,
});
export type ChatResponse = typeof ChatResponse.static;
