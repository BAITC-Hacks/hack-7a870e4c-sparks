import { Type } from "@sinclair/typebox";
import { t } from "elysia";

export const object: typeof t.Object = (properties, options) =>
	t.Object(properties, { additionalProperties: false, ...options });

export const nullable = <T extends ReturnType<typeof t.String>>(schema: T) =>
	t.Union([schema, t.Null()]);

export const messageSchema = object({ message: t.String() });
export const errorResponses = {
	400: messageSchema,
	401: messageSchema,
	403: messageSchema,
	404: messageSchema,
	409: messageSchema,
	413: messageSchema,
	429: messageSchema,
	500: messageSchema,
};
export const emptyBodySchema = t.Optional(
	object({}, { additionalProperties: false }),
);

// Strict integer output: Elysia t.Integer accepts numeric strings as input.
export const integer = Type.Integer;
