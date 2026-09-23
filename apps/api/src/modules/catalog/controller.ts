import { Elysia } from "elysia";
import { AuthService } from "../auth/service";
import { secured } from "../../utils/http";
import { errorResponses } from "../../utils/http/model";
import * as Models from "./model";
import { CatalogService } from "./service";

export const createCatalogController = (
	service: CatalogService,
	auth: AuthService,
) =>
	new Elysia({ name: "catalog", prefix: "/api/catalog" }).get(
		"",
		async ({ request }) => {
			await auth.session(request);
			return service.catalog();
		},
		{
			response: { 200: Models.Catalog, ...errorResponses },
			detail: secured(
				"getCatalog",
				"Каталог навыков и профилей ролей",
				"Career",
			),
		},
	);
