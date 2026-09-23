import { t } from "elysia";
import { object, nullable, integer } from "../../utils/http/model";
export const Grade = t.Union([
	t.Literal("Junior"),
	t.Literal("Middle"),
	t.Literal("Senior"),
	t.Literal("Lead"),
]);
const DateString = t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" });
const Level = integer({ minimum: 0, maximum: 5 });
const Levels = t.Record(t.String(), Level);
export const Goal = object({
	target_role: t.String({ minLength: 1 }),
	target_grade: Grade,
});
export const Skill = object({
	skill_id: t.String(),
	name: t.String(),
	type: t.String(),
	category: t.String(),
	description: t.String(),
});
export const RoleProfile = object({
	role: t.String(),
	grade: Grade,
	required_skills: Levels,
	critical_skills: t.Array(t.String()),
});
export const Employee = object({
	employee_id: t.String(),
	full_name: t.String(),
	department: t.String(),
	role: t.String(),
	grade: Grade,
	manager_id: nullable(t.String()),
	hire_date: DateString,
	tenure_months: integer(),
	work_format: t.Union([
		t.Literal("office"),
		t.Literal("hybrid"),
		t.Literal("remote"),
	]),
	preferred_language: t.Union([
		t.Literal("ru"),
		t.Literal("kk"),
		t.Literal("en"),
	]),
	career_goal: t.Union([Goal, t.Null()]),
	skills: Levels,
	last_review_date: DateString,
});
const History = object({
	record_id: t.String(),
	employee_id: t.String(),
	event_id: t.String(),
	date: DateString,
	due_date: nullable(DateString),
	status: t.Union([
		t.Literal("completed"),
		t.Literal("in_progress"),
		t.Literal("dropped"),
		t.Literal("no_show"),
		t.Literal("declined"),
		t.Literal("overdue"),
	]),
	completion_pct: integer({ minimum: 0, maximum: 100 }),
	score: t.Union([integer(), t.Null()]),
	feedback_rating: t.Union([integer(), t.Null()]),
	assigned_by: t.Union([
		t.Literal("self"),
		t.Literal("manager"),
		t.Literal("hr"),
	]),
	completed_at: t.Optional(nullable(t.String())),
	title: t.String(),
	mandatory: t.Boolean(),
});
export const Profile = object({
	employee: Employee,
	effective_skills: Levels,
	target: t.Union([Goal, t.Null()]),
	target_source: t.Union([
		t.Literal("explicit"),
		t.Literal("next_grade"),
		t.Literal("none"),
	]),
	readiness: t.Union([t.Number(), t.Null()]),
	gaps: t.Array(
		object({
			skill_id: t.String(),
			name: t.String(),
			current: t.Number(),
			required: t.Number(),
			gap: t.Number(),
			critical: t.Boolean(),
			covered: t.Boolean(),
		}),
	),
	history: t.Array(History),
	warnings: t.Array(t.String()),
});
export const GoalInput = object(
	{ goal: t.Union([Goal, t.Null()]) },
	{ additionalProperties: false },
);
export const Employees = object({
	employees: t.Array(
		object({
			employee_id: t.String(),
			full_name: t.String(),
			role: t.String(),
			grade: Grade,
			department: t.String(),
		}),
	),
});
export const Complete = object({
	profile: Profile,
	already_completed: t.Boolean(),
});
export const EmployeeParams = object({
	id: t.String({ minLength: 1, maxLength: 128 }),
});
export const ActivityParams = object({
	id: t.String({ minLength: 1, maxLength: 128 }),
	eventId: t.String({ minLength: 1, maxLength: 128 }),
});
