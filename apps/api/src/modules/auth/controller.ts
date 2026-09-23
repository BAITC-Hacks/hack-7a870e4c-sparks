import { Elysia } from "elysia";
import { AuthService } from "../auth/service";
import { secured } from "../../utils/http";
import { errorResponses } from "../../utils/http/model";
import * as Models from "./model";

export const createAuthController = (auth: AuthService) =>
	new Elysia({ name: "auth", prefix: "/api/auth" })
		.post(
			"/login",
			async ({ body, set }) => {
				const result = await auth.login(body.username, body.password);
				set.headers["set-cookie"] = auth.cookie(result.token);
				return result.user;
			},
			{
				body: Models.Login,
				response: { 200: Models.Session, ...errorResponses },
				detail: {
					operationId: "login",
					summary: "Войти по логину и паролю",
					tags: ["Auth"],
					description:
						"Создает сессию на 12 часов. Cookie: HttpOnly, SameSite=Lax, Secure на HTTPS. Ограничение: 10 неудачных попыток на аккаунт за 15 минут.",
				},
			},
		)
		.get("/session", ({ request }) => auth.session(request), {
			response: { 200: Models.Session, ...errorResponses },
			detail: secured("getSession", "Текущий пользователь", "Auth"),
		})
		.post(
			"/logout",
			async ({ request, set }) => {
				await auth.logout(request);
				set.headers["set-cookie"] = auth.cookie("", true);
				return { ok: true as const };
			},
			{
				response: { 200: Models.Ok, ...errorResponses },
				detail: secured("logout", "Завершить текущую сессию", "Auth"),
			},
		);
