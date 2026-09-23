import { Elysia } from "elysia";
import { AuthService, authorize } from "../auth/service";
import { HttpError, secured } from "../../utils/http";
import { errorResponses } from "../../utils/http/model";
import * as Models from "./model";
import { HrService } from "./service";

export const createHrController = (service: HrService, auth: AuthService) =>
	new Elysia({ name: "hr", prefix: "/api/hr" })
		.get(
			"/overview",
			async ({ request }) => {
				authorize(await auth.session(request));
				return service.overview();
			},
			{
				response: { 200: Models.HrOverview, ...errorResponses },
				detail: secured(
					"getHrOverview",
					"HR-сводка по дефицитам и участию",
					"HR",
				),
			},
		)
		.post(
			"/import",
			async ({ request, body }) => {
				authorize(await auth.session(request));
				if (
					Buffer.byteLength(body.employees_json) +
						Buffer.byteLength(body.history_csv) >
					8 * 1024 * 1024
				)
					throw new HttpError(413, "Общий размер файлов превышает 8 МиБ.");
				return service.importData(body.employees_json, body.history_csv);
			},
			{
				body: Models.ImportInput,
				response: { 200: Models.ImportResult, ...errorResponses },
				detail: secured(
					"importData",
					"Загрузить профили JSON и историю CSV",
					"HR",
					"Только синтетические данные. Один файл может быть пустым. Проверяется весь объединенный набор, затем атомарно выполняется upsert по employee_id/record_id. Ошибка отменяет весь запрос. Импорт не выдает учетные записи и не меняет роли.",
				),
			},
		);
