import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Store } from "../src/utils/db";

/** Each test owns one schema in an explicitly configured disposable database. */
export async function createTestStore(): Promise<{
	store: Store;
	url: string;
	close: () => Promise<void>;
}> {
	const configured = process.env.TEST_DATABASE_URL;
	if (!configured) {
		throw new Error(
			"PostgreSQL integration tests require TEST_DATABASE_URL pointing to a disposable test database.",
		);
	}
	const url = new URL(configured);
	if (!["postgresql:", "postgres:"].includes(url.protocol))
		throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
	// Generated locally; never interpolate an identifier supplied by a request or environment.
	const schema = `career_test_${randomUUID().replaceAll("-", "")}`;
	const admin = await Store.open(url.toString());
	let store: Store | undefined;
	let created = false;
	try {
		await admin.prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
		created = true;
		url.searchParams.set("schema", schema);
		store = await Store.open(url.toString());
		const migrationsDirectory = new URL(
			"../prisma/migrations/",
			import.meta.url,
		);
		const directories = (
			await readdir(migrationsDirectory, { withFileTypes: true })
		)
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
		const migrations = await Promise.all(
			directories.map((directory) =>
				readFile(
					new URL(`${directory}/migration.sql`, migrationsDirectory),
					"utf8",
				),
			),
		);
		await store.write(async (tx) => {
			await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
			// The checked-in migrations have no procedural SQL or semicolons in literals.
			for (const statement of migrations
				.join("\n")
				.split(";")
				.map((sql) => sql.trim())
				.filter(Boolean)) {
				await tx.$executeRawUnsafe(statement);
			}
		});
		const activeStore = store;
		let closing: Promise<void> | undefined;
		return {
			store: activeStore,
			url: url.toString(),
			close: () =>
				(closing ??= (async () => {
					try {
						await activeStore.close();
						await admin.prisma.$executeRawUnsafe(
							`DROP SCHEMA "${schema}" CASCADE`,
						);
					} finally {
						await admin.close();
					}
				})()),
		};
	} catch (error) {
		try {
			await store?.close();
			if (created)
				await admin.prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
		} finally {
			await admin.close();
		}
		throw error;
	}
}
