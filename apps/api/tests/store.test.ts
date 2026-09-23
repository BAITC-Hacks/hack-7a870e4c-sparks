import { afterEach, describe, expect, test } from "bun:test";
import type { Dataset, History } from "../src/contracts";
import { Store } from "../src/utils/db";
import { createTestStore } from "./database";

const stores: Store[] = [];
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
	for (const store of stores.splice(0)) await store.close();
	for (const cleanup of cleanups.splice(0)) await cleanup();
});

function dataset(): Dataset {
	return {
		as_of_date: "2026-10-01",
		employees: [
			{
				employee_id: "TEST001",
				full_name: "Synthetic Employee",
				department: "Engineering",
				role: "Backend Engineer",
				grade: "Junior",
				manager_id: null,
				hire_date: "2025-01-01",
				tenure_months: 21,
				work_format: "remote",
				preferred_language: "ru",
				career_goal: {
					target_role: "Backend Engineer",
					target_grade: "Middle",
				},
				skills: { SK_SQL: 1 },
				last_review_date: "2026-09-01",
			},
		],
		events: [
			{
				event_id: "EV_101",
				title: "SQL practice",
				description: "Synthetic practice",
				type: "course",
				format: "self_paced",
				duration_hours: 2,
				mandatory: false,
				target_roles: ["Backend Engineer"],
				target_grades: ["Junior", "Middle", "Senior", "Lead"],
				develops_skills: [{ skill_id: "SK_SQL", gain: 1, max_level: 5 }],
				prerequisites: {},
				upcoming_sessions: [],
			},
		],
		skills: [
			{
				skill_id: "SK_SQL",
				name: "SQL",
				type: "hard",
				category: "engineering",
				description: "SQL",
			},
		],
		role_profiles: ["Junior", "Middle", "Senior", "Lead"].map(
			(grade, index) => ({
				role: "Backend Engineer",
				grade: grade as "Junior" | "Middle" | "Senior" | "Lead",
				required_skills: { SK_SQL: index + 2 },
				critical_skills: ["SK_SQL"],
			}),
		),
		history: [],
	};
}

async function createStore(data = dataset()) {
	const database = await createTestStore();
	cleanups.push(database.close);
	await database.store.seed(data);
	return database;
}

function row(overrides: Partial<History> = {}): History {
	return {
		record_id: "TEST_HISTORY",
		employee_id: "TEST001",
		event_id: "EV_101",
		date: "2026-09-01",
		due_date: null,
		status: "in_progress",
		completion_pct: 50,
		score: null,
		feedback_rating: null,
		assigned_by: "manager",
		...overrides,
	};
}

function csv(rows: History[]) {
	const headers = [
		"record_id",
		"employee_id",
		"event_id",
		"date",
		"due_date",
		"status",
		"completion_pct",
		"score",
		"feedback_rating",
		"assigned_by",
		"completed_at",
	] as const;
	return [
		headers.join(","),
		...rows.map((item) => headers.map((key) => item[key] ?? "").join(",")),
	].join("\n");
}

describe("Prisma PostgreSQL Career Quest store", () => {
	test("persists changes and a repeated seed never resets them", async () => {
		const { store, url } = await createStore();
		const goal = {
			target_role: "Backend Engineer",
			target_grade: "Senior" as const,
		};
		await store.updateGoal("TEST001", goal);
		await store.completeActivity("TEST001", "EV_101");
		await store.seed(dataset());
		await store.close();
		const reopened = await Store.open(url);
		stores.push(reopened);
		const persisted = await reopened.readDataset();
		expect(persisted.employees[0]?.career_goal).toEqual(goal);
		expect(persisted.history).toHaveLength(1);
		expect(persisted.history[0]?.status).toBe("completed");
	});

	test("simultaneous completions produce exactly one completion and one skill gain", async () => {
		const { store } = await createStore();
		const results = await Promise.all(
			Array.from({ length: 5 }, () =>
				store.completeActivity("TEST001", "EV_101"),
			),
		);
		expect(results.filter((result) => !result.already_completed)).toHaveLength(
			1,
		);
		expect(
			results.every((result) => result.profile.effective_skills.SK_SQL === 2),
		).toBe(true);
		expect((await store.readDataset()).history).toHaveLength(1);
	});

	test("separate PostgreSQL connections cannot complete the same activity twice", async () => {
		const { store, url } = await createStore();
		const other = await Store.open(url);
		stores.push(other);
		const results = await Promise.all([
			store.completeActivity("TEST001", "EV_101"),
			other.completeActivity("TEST001", "EV_101"),
		]);
		expect(results.filter((result) => !result.already_completed)).toHaveLength(
			1,
		);
		expect(
			results.every((result) => result.profile.effective_skills.SK_SQL === 2),
		).toBe(true);
		expect((await other.readDataset()).history).toHaveLength(1);
	});

	test("PostgreSQL test schemas isolate data in the same database", async () => {
		const first = await createStore();
		const otherData = dataset();
		otherData.employees[0]!.full_name = "Another isolated employee";
		const second = await createStore(otherData);
		await first.store.completeActivity("TEST001", "EV_101");
		const secondDataset = await second.store.readDataset();
		expect(secondDataset.employees[0]?.full_name).toBe(
			"Another isolated employee",
		);
		expect(secondDataset.history).toHaveLength(0);
		expect((await first.store.readDataset()).employees[0]?.full_name).toBe(
			"Synthetic Employee",
		);
	});

	test("completion updates the latest started row without changing its original fields", async () => {
		const data = dataset();
		data.history = [row({ date: "2026-08-15" })];
		const { store } = await createStore(data);
		const result = await store.completeActivity("TEST001", "EV_101");
		expect(result.profile.effective_skills.SK_SQL).toBe(2);
		const persisted = (await store.readDataset()).history[0];
		expect(persisted).toMatchObject({
			record_id: "TEST_HISTORY",
			date: "2026-08-15",
			assigned_by: "manager",
			status: "completed",
			completion_pct: 100,
			completed_at: "2026-10-01T12:00:00.000Z",
		});
	});

	test("repeatable activity permits one new completion per virtual day", async () => {
		const data = dataset();
		data.events[0]!.event_id = "EV_036";
		data.history = [
			row({
				event_id: "EV_036",
				date: "2026-08-15",
				status: "completed",
				completion_pct: 100,
			}),
		];
		const { store } = await createStore(data);
		const first = await store.completeActivity("TEST001", "EV_036");
		const second = await store.completeActivity("TEST001", "EV_036");
		expect(first.already_completed).toBe(false);
		expect(second.already_completed).toBe(true);
		expect(second.profile.effective_skills.SK_SQL).toBe(2);
		expect((await store.readDataset()).history).toHaveLength(2);
	});

	test("invalid combined import preserves employees, history and account roles", async () => {
		const { store } = await createStore();
		await store.write(async (tx) => {
			await tx.account.create({
				data: { username: "hr", passwordHash: "test-hash", role: "hr" },
			});
		});
		const before = await store.readDataset();
		const changed = { ...before.employees[0]!, full_name: "Changed name" };
		await expect(
			store.importData(
				JSON.stringify({ employees: [changed] }),
				csv([row({ employee_id: "MISSING" })]),
			),
		).rejects.toThrow();
		expect(await store.readDataset()).toEqual(before);
		expect(
			(await store.prisma.account.findUnique({ where: { username: "hr" } }))
				?.role,
		).toBe("hr");
	});

	test("valid imported rows replace their IDs and repeated imports do not duplicate them", async () => {
		const { store } = await createStore();
		const first = await store.importData("", csv([row()]));
		const second = await store.importData(
			"",
			csv([row({ completion_pct: 80 })]),
		);
		expect(first.history).toBe(1);
		expect(second.history).toBe(1);
		expect((await store.readDataset()).history).toEqual([
			row({ completion_pct: 80, completed_at: null }),
		]);
	});

	test("a failed write rolls back and does not poison subsequent transactions", async () => {
		const { store } = await createStore();
		await expect(
			store.write(async (tx) => {
				await tx.account.create({
					data: { username: "rollback", passwordHash: "test-hash", role: "hr" },
				});
				throw new Error("Deliberate rollback");
			}),
		).rejects.toThrow("Deliberate rollback");
		expect(
			await store.prisma.account.findUnique({
				where: { username: "rollback" },
			}),
		).toBeNull();
		const profile = await store.updateGoal("TEST001", null);
		expect(profile.employee.career_goal).toBeNull();
	});

	test("database foreign keys reject history without an employee", async () => {
		const { store } = await createStore();
		await expect(
			store.write(async (tx) => {
				await tx.history.create({
					data: {
						id: "BAD",
						employeeId: "UNKNOWN",
						eventId: "EV_101",
						date: "2026-10-01",
						payload: {},
					},
				});
			}),
		).rejects.toThrow();
		expect((await store.readDataset()).history).toHaveLength(0);
	});

	test("mandatory activities are never completed through the recommendation flow", async () => {
		const data = dataset();
		data.events[0]!.mandatory = true;
		const { store } = await createStore(data);
		await expect(store.completeActivity("TEST001", "EV_101")).rejects.toThrow(
			"Обязательные",
		);
		expect((await store.readDataset()).history).toHaveLength(0);
	});
});
