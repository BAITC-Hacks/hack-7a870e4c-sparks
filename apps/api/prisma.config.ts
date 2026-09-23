import { defineConfig } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: { path: "prisma/migrations" },
	datasource: {
		url:
			process.env.DATABASE_URL ||
			"postgresql://career:change-me@localhost:5432/career_quest?schema=public",
	},
});
