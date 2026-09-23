import { createCatalogController } from "./controller";
import { CatalogService } from "./service";
import type { AuthService } from "../auth/service";

export const createCatalogModule = (
	service: CatalogService,
	auth: AuthService,
) => createCatalogController(service, auth);
export { CatalogService } from "./service";
