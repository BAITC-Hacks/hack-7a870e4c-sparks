import { t } from "elysia";
import { object, nullable } from "../../utils/http/model";
export const Login = object(
	{
		username: t.String({ minLength: 1, maxLength: 128 }),
		password: t.String({ minLength: 1, maxLength: 1024 }),
	},
	{ additionalProperties: false },
);
export const Session = object({
	username: t.String(),
	role: t.Union([t.Literal("employee"), t.Literal("hr")]),
	employee_id: nullable(t.String()),
	full_name: t.String(),
});
export const Ok = object({ ok: t.Literal(true) });
