import { t } from "elysia";
import { object, integer } from "../../utils/http/model";
const DateString = t.String();
export const HrOverview = object({
	total_employees: integer(),
	employees_without_step: t.Array(
		object({
			employee_id: t.String(),
			full_name: t.String(),
			role: t.String(),
			reason: t.String(),
		}),
	),
	skill_gaps: t.Array(
		object({
			skill_id: t.String(),
			name: t.String(),
			employees: integer(),
			average_gap: t.Number(),
		}),
	),
	participation: t.Array(
		object({
			event_id: t.String(),
			title: t.String(),
			mandatory: t.Boolean(),
			completed: integer(),
			in_progress: integer(),
			other: integer(),
			total: integer(),
		}),
	),
	as_of_date: DateString,
});
export const ImportInput = object(
	{
		employees_json: t.String({ maxLength: 8 * 1024 * 1024 }),
		history_csv: t.String({ maxLength: 8 * 1024 * 1024 }),
	},
	{ additionalProperties: false },
);
export const ImportResult = object({
	employees: integer(),
	history: integer(),
	message: t.String(),
});
