import { createRecommendationsController } from "./controller";
import { RecommendationsService } from "./service";
import type { AuthService } from "../auth/service";

export const createRecommendationsModule = (
	service: RecommendationsService,
	auth: AuthService,
) => createRecommendationsController(service, auth);
export { RecommendationsService } from "./service";
