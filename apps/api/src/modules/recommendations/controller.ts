import { Elysia } from "elysia";
import { AuthService, authorize } from "../auth/service";
import { secured } from "../../utils/http";
import {
	errorResponses,
	emptyBodySchema as EmptyBody,
	messageSchema,
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
				"Агент выбирает только допустимые мероприятия и подтвержденные факторы из серверного контекста. При недоступности агента или модели возвращается mode=rules. Если допустимых шагов нет, массив пуст и приведена причина.",
			),
		},
	)
	.get(
		"/api/employees/:id/plan",
		async ({ request, params }) => {
			authorize(await auth.session(request), params.id);
			return service.planForEmployee(params.id);
		},
		{
			params: EmployeeParams,
			response: { 200: Models.Plan, ...errorResponses, 503: messageSchema },
			detail: secured(
				"getCareerPlan",
				"Получить карьерный план и прогноз развития навыков",
				"Career",
				"Контекст профиля, каталога и истории формируется на сервере. План содержит расчетную траекторию, разрывы навыков и предупреждения; готовность не гарантирует повышение. При недоступности агента возвращается 503.",
			),
		},
	)
	.post(
		"/api/employees/:id/chat",
		async ({ request, params, body }) => {
			authorize(await auth.session(request), params.id);
			return service.chatForEmployee(params.id, body);
		},
		{
			params: EmployeeParams,
			body: Models.ChatInput,
			response: {
				200: Models.ChatResponse,
				...errorResponses,
				503: messageSchema,
			},
			detail: secured(
				"chatWithCareerAdvisor",
				"Обсудить карьерное развитие с AI-советником",
				"Career",
				"Клиент передает сообщение и до 20 реплик истории; контекст сотрудника формирует API после проверки доступа. Ответ включает план и рекомендации. При недоступности агента возвращается 503.",
			),
		},
	);
