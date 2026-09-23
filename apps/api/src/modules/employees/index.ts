import { createEmployeesController } from "./controller";
import { EmployeesService } from "./service";
import type { AuthService } from "../auth/service";

export const createEmployeesModule = (
	service: EmployeesService,
	auth: AuthService,
) => createEmployeesController(service, auth);
export { EmployeesService } from "./service";
