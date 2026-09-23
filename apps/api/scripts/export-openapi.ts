import { resolve } from "node:path";
import { Store } from "../src/utils/db";
import { createApp } from "../src/app";
import { readConfig } from "../src/utils/config";

const store = Store.create(readConfig({}).databaseUrl);
try {
	const { app } = createApp(store, readConfig());
	const response = await app.handle(
		new Request("http://localhost/api/openapi.json"),
	);
	if (!response.ok)
		throw new Error(`OpenAPI export failed: ${response.status}`);
	const spec = await response.json();
	if (!spec.openapi || !spec.paths?.["/api/auth/login"])
		throw new Error("Incomplete OpenAPI document");
	const target = resolve(process.argv[2] || "openapi.json");
	await Bun.write(target, JSON.stringify(spec, null, 2) + "\n");
	console.info(
		`OpenAPI JSON: ${target} (${Object.keys(spec.paths).length} paths)`,
	);
} finally {
	await store.close();
}
