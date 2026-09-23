import { openapi, type ElysiaOpenAPIConfig } from "@elysiajs/openapi";
import { SESSION_COOKIE } from "../modules/auth/service";

const specPath = "/api/openapi.json";
// v1.4.16 strips the leading slash from specPath in its Swagger HTML.
// The runtime accepts this override although its options type omits `url`.
const swagger: NonNullable<ElysiaOpenAPIConfig["swagger"]> & { url: string } = {
	url: specPath,
};

export const createOpenApiPlugin = () =>
	openapi({
		path: "/api/docs",
		specPath,
		provider: "swagger-ui",
		swagger,
		documentation: {
			info: {
				title: "Career Quest API",
				version: "1.0.0",
				description:
					"API кейса Career Quest. Синтетические данные, дата среза из meta.as_of_date. HttpOnly cookie-сессия; сотрудник видит только себя, HR — профили, аналитику и импорт. Расчетный режим явно отделен от AI.",
			},
			tags: [
				{ name: "Auth", description: "Индивидуальная авторизация и сессии" },
				{ name: "Career", description: "Профиль, цель и карьерные шаги" },
				{ name: "HR", description: "HR-аналитика и атомарный импорт" },
				{ name: "System", description: "Состояние сервера" },
			],
			components: {
				securitySchemes: {
					session: {
						type: "apiKey",
						in: "cookie",
						name: SESSION_COOKIE,
						description:
							"Сервер устанавливает cookie при успешном POST /api/auth/login.",
					},
				},
			},
		},
	});
