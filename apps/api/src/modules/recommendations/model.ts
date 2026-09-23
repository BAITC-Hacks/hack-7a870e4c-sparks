import { t } from "elysia";
import { object, nullable, integer } from "../../utils/http/model";
import { Grade } from "../employees/model";
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
