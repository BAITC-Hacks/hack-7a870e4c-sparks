import { Elysia } from "elysia";
import { AuthService, authorize } from "../auth/service";
import { secured } from "../../utils/http";
import {
	errorResponses,
	emptyBodySchema as EmptyBody,
} from "../../utils/http/model";
import * as Models from "./model";
import { EmployeeParams } from "../employees/model";
import { RecommendationsService } from "./service";

export const createRecommendationsController = (
	service: RecommendationsService,
	auth: AuthService,
) =>
	new Elysia({ name: "recommendations" }).post(
		"/api/employees/:id/recommendations",
		async ({ request, params }) => {
			authorize(await auth.session(request), params.id);
			return service.forEmployee(params.id);
		},
		{
			params: EmployeeParams,
			body: EmptyBody,
			response: { 200: Models.Recommendations, ...errorResponses },
			detail: secured(
				"getRecommendations",
				"Получить до трех объяснимых рекомендаций",
				"Career",
				"Модель выбирает только допустимые мероприятия и подтвержденные факторы. Таймаут AI до 8 секунд. При недоступности модели возвращается mode=rules. Если допустимых шагов нет, массив пуст и приведена причина.",
			),
		},
	);
