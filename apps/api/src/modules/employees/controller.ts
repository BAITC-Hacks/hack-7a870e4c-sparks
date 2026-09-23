import { Elysia } from "elysia";
import { AuthService, authorize } from "../auth/service";
import { secured } from "../../utils/http";
import {
	errorResponses,
	emptyBodySchema as EmptyBody,
} from "../../utils/http/model";
import * as Models from "./model";
import { EmployeeParams, ActivityParams } from "./model";
import { EmployeesService } from "./service";

export const createEmployeesController = (
	service: EmployeesService,
	auth: AuthService,
) =>
	new Elysia({ name: "employees", prefix: "/api/employees" })
		.get(
			"",
			async ({ request }) => {
				authorize(await auth.session(request));
				return service.list();
			},
			{
				response: { 200: Models.Employees, ...errorResponses },
				detail: secured("getEmployees", "Список сотрудников для HR", "HR"),
			},
		)
		.get(
			"/:id",
			async ({ request, params }) => {
				authorize(await auth.session(request), params.id);
				return service.profile(params.id);
			},
			{
				params: EmployeeParams,
				response: { 200: Models.Profile, ...errorResponses },
				detail: secured(
					"getProfile",
					"Профиль и карьерная траектория",
					"Career",
					"Сотрудник получает только свой профиль; HR может просматривать любой. Readiness — покрытие требований цели, не вероятность повышения.",
				),
			},
		)
		.patch(
			"/:id/goal",
			async ({ request, params, body }) => {
				authorize(await auth.session(request), params.id);
				return service.updateGoal(params.id, body.goal);
			},
			{
				params: EmployeeParams,
				body: Models.GoalInput,
				response: { 200: Models.Profile, ...errorResponses },
				detail: secured(
					"updateGoal",
					"Изменить карьерную цель",
					"Career",
					"Пара роли и грейда должна существовать в каталоге. null включает следующий грейд по умолчанию; у Lead следующего грейда нет.",
				),
			},
		)
		.post(
			"/:id/activities/:eventId/complete",
			async ({ request, params }) => {
				authorize(await auth.session(request), params.id);
				return service.complete(params.id, params.eventId);
			},
			{
				params: ActivityParams,
				body: EmptyBody,
				response: { 200: Models.Complete, ...errorResponses },
				detail: secured(
					"completeActivity",
					"Подтвердить выполнение и пересчитать навыки",
					"Career",
					"Демонстрационное завершение на дату среза. Повторный запрос идемпотентен; обязательные мероприятия исключены. Это не подтверждение посещения реального обучения.",
				),
			},
		);
