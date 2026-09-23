import { readConfig, validateCredentials } from "./utils/config";
import { loadDataset } from "./utils/dataset";
import { Store } from "./utils/db";
import { createApp } from "./app";

const config = readConfig();
validateCredentials(config);
const store = await Store.open(config.databaseUrl);
try {
	await store.seed(await loadDataset(config.datasetPath));
	const { app, auth } = createApp(store, config);
	await auth.bootstrap();
	app.listen({
		port: config.port,
		hostname: process.env.API_HOST || "127.0.0.1",
	});
	console.info(`Career Quest API: http://localhost:${config.port}/api/docs`);
	let stopping = false;
	const shutdown = async () => {
		if (stopping) return;
		stopping = true;
		await app.stop();
		await store.close();
		process.exit(0);
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
} catch (error) {
	await store.close();
	throw error;
}
