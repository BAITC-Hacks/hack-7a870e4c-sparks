import { createHrController } from "./controller";
import { HrService } from "./service";
import type { AuthService } from "../auth/service";

export const createHrModule = (service: HrService, auth: AuthService) =>
	createHrController(service, auth);
export { HrService } from "./service";
