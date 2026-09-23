import { createAuthController } from "./controller";
import { AuthService } from "./service";

export const createAuthModule = (service: AuthService) =>
	createAuthController(service);
export { AuthService } from "./service";
