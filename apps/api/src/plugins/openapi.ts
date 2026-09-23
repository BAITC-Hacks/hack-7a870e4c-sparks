import { openapi } from "@elysiajs/openapi";
import { SESSION_COOKIE } from "../modules/auth/service";

export const createOpenApiPlugin = () =>
	openapi({
		path: "/api/docs",
		specPath: "/api/openapi.json",
		provider: "swagger-ui",
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
