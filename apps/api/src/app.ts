import { Elysia, t } from "elysia";
import type { Store } from "./utils/db";
import type { AppConfig } from "./utils/config";
import { HttpError } from "./utils/http";
import { errorResponses, object } from "./utils/http/model";
import { createOpenApiPlugin } from "./plugins/openapi";
import { AuthService, createAuthModule } from "./modules/auth";
import { EmployeesService, createEmployeesModule } from "./modules/employees";
import { CatalogService, createCatalogModule } from "./modules/catalog";
import {
	RecommendationsService,
	createRecommendationsModule,
} from "./modules/recommendations";
import { HrService, createHrModule } from "./modules/hr";
import { agentHealth } from "./modules/recommendations/service";

const healthSchema = object({ status: t.String(), ai_configured: t.Boolean(), agent_available: t.Boolean() });

export function createApp(store: Store, config: AppConfig) {
	const auth = new AuthService(store, config);
	const app = new Elysia({ normalize: false, serve: { maxRequestBodySize: 18 * 1024 * 1024 } })
		.use(createOpenApiPlugin())
		.onError({ as: "global" }, ({ error, code, set }) => {
			if (error instanceof HttpError) {
				set.status = error.status;
				return { message: error.message };
			}
			if (code === "VALIDATION" || code === "PARSE") {
				set.status = 400;
				return { message: "Некорректный формат запроса." };
			}
			if (code === "NOT_FOUND") {
				set.status = 404;
				return { message: "Маршрут не найден." };
			}
			// Domain/import validation errors are exposed only by the bounded mutation wrapper below.
			console.error(
				"[career-api] request failed",
				code,
				error instanceof Error ? error.name : "UnknownError",
			);
			set.status = 500;
			return { message: "Внутренняя ошибка сервера." };
		})
		.onBeforeHandle({ as: "global" }, ({ request, set }) => {
			set.headers["cache-control"] = "no-store";
			set.headers["x-content-type-options"] = "nosniff";
			if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
				const origin = request.headers.get("origin");
				if (
					origin &&
					origin !== config.appOrigin &&
					origin !== new URL(request.url).origin
				)
					throw new HttpError(403, "Источник запроса не разрешен.");
			}
		})
		.get(
			"/api/health",
			async () => {
				await store.prisma.$queryRaw`SELECT 1`;
				return { status: "ok", ...await agentHealth(config.agentUrl) };
			},
			{
				response: { 200: healthSchema, ...errorResponses },
				detail: {
					operationId: "health",
					summary: "Статус API и соединения с БД",
					tags: ["System"],
				},
			},
		)
		.use(createAuthModule(auth))
		.use(createEmployeesModule(new EmployeesService(store), auth))
		.use(createCatalogModule(new CatalogService(store), auth))
		.use(
			createRecommendationsModule(
				new RecommendationsService(store, config),
				auth,
			),
		)
		.use(createHrModule(new HrService(store), auth));
	return { app, auth };
}
