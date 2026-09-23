import { afterAll, describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import { readConfig } from "../src/utils/config";
import { Store } from "../src/utils/db";

// Documentation must work without a DB connection, an agent or a session.
const config = readConfig({});
const store = Store.create(config.databaseUrl);
const { app } = createApp(store, config);
afterAll(() => store.close());

describe("Swagger specification loading", () => {
	for (const path of ["/api/docs", "/api/docs/"]) {
		test(`the specification URL rendered at ${path} resolves to a served document`, async () => {
			const pageUrl = new URL(path, "http://localhost:3001");
			const page = await app.handle(new Request(pageUrl));
			expect(page.status).toBe(200);
			expect(page.headers.get("content-type")).toContain("text/html");
			const html = await page.text();
			const options = html.match(/SwaggerUIBundle\((\{[^\n]+\})\)/)?.[1];
			expect(options).toBeDefined();
			const { url } = JSON.parse(options!);
			// Match browser URL resolution, including a trailing slash on the page.
			const specUrl = new URL(url, pageUrl);
			const response = await app.handle(new Request(specUrl));
			expect(response.status).toBe(200);
			expect(specUrl.pathname).toBe("/api/openapi.json");
			expect(response.headers.get("content-type")).toContain("application/json");
			const spec = await response.json();
			expect(spec.openapi).toMatch(/^3\./);
			expect(spec.paths["/api/auth/login"].post.operationId).toBe("login");
			expect(spec.paths["/api/employees/{id}/chat"].post.operationId).toBe("chatWithCareerAdvisor");
		});
	}
});
