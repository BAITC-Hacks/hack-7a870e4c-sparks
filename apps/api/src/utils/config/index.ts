import { resolve } from "node:path";

export type AppConfig = {
	port: number;
	databaseUrl: string;
	datasetPath: string;
	appOrigin: string;
	cookieSecure: boolean;
	hrPassword: string;
	credentialSecret: string;
	demoEmployeeId: string;
	demoEmployeePassword: string;
	agentUrl: string;
};

export function readConfig(env = process.env): AppConfig {
	const port = Number(env.API_PORT || "3001");
	if (!Number.isInteger(port) || port < 1 || port > 65535)
		throw new Error("Некорректный API_PORT.");
	if (env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL))
		throw new Error("DATABASE_URL должен указывать на PostgreSQL.");
	const appOrigin = new URL(env.APP_ORIGIN || "http://localhost:3000").origin;
	const agentUrl = (env.AGENT_URL ?? "http://127.0.0.1:8000").trim().replace(/\/$/, "");
	if (agentUrl) {
		const url = new URL(agentUrl);
		if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/")
			throw new Error("AGENT_URL должен быть HTTP(S)-адресом агента без пути и учетных данных.");
	}
	return {
		port,
		databaseUrl:
			env.DATABASE_URL ||
			"postgresql://career:change-me@localhost:5432/career_quest?schema=public",
		datasetPath:
			env.DATASET_PATH ||
			resolve(import.meta.dir, "../../../../../case_1/career_quest_dataset"),
		appOrigin,
		cookieSecure: env.COOKIE_SECURE === "true",
		hrPassword: env.HR_PASSWORD || "",
		credentialSecret: env.CREDENTIAL_SECRET || "",
		demoEmployeeId: env.DEMO_EMPLOYEE_ID || "E0005",
		demoEmployeePassword: env.DEMO_EMPLOYEE_PASSWORD || "",
		agentUrl,
	};
}

export function validateCredentials(config: AppConfig) {
	if (config.hrPassword.length < 12)
		throw new Error("HR_PASSWORD должен содержать минимум 12 символов.");
	if (config.credentialSecret.length < 32)
		throw new Error("CREDENTIAL_SECRET должен содержать минимум 32 символа.");
	if (config.demoEmployeePassword && config.demoEmployeePassword.length < 12)
		throw new Error(
			"DEMO_EMPLOYEE_PASSWORD должен содержать минимум 12 символов.",
		);
}
