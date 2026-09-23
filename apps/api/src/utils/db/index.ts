import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../../generated/client/client";
import type {
	Dataset,
	Employee,
	Event,
	Goal,
	History,
	Profile,
	RoleProfile,
	Skill,
} from "../../contracts";
import { mergeImport, validateDataset } from "../dataset";
import { candidatesFor, profileFor } from "../../modules/employees/service";

// Queue writes within one process; PostgreSQL serializable transactions also
// protect read/modify/write operations performed by separate API instances.
export class Store {
	readonly prisma: PrismaClient;
	private mutations: Promise<void> = Promise.resolve();

	private constructor(url: string) {
		const connection = new URL(url);
		if (!["postgresql:", "postgres:"].includes(connection.protocol)) {
			throw new Error("DATABASE_URL должен указывать на PostgreSQL.");
		}
		const schema = connection.searchParams.get("schema") || "public";
		this.prisma = new PrismaClient({
			adapter: new PrismaPg({ connectionString: url }, { schema }),
		});
	}

	/** Create the client without opening a connection, including OpenAPI export. */
	static create(url: string): Store {
		return new Store(url);
	}

	static async open(url: string): Promise<Store> {
		const store = Store.create(url);
		await store.prisma.$connect();
		return store;
	}

	/** Serialize an atomic write, including account/session writes made by the API. */
	async write<T>(
		operation: (tx: Prisma.TransactionClient) => Promise<T>,
	): Promise<T> {
		const pending = this.mutations.then(async () => {
			for (let attempt = 0; ; attempt++) {
				try {
					return await this.prisma.$transaction(operation, {
						maxWait: 10_000,
						timeout: 30_000,
						isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
					});
				} catch (error) {
					// PostgreSQL may abort a serializable transaction during concurrent
					// writes by another process. Recompute from the new committed state.
					if (
						!(error instanceof Prisma.PrismaClientKnownRequestError) ||
						error.code !== "P2034" ||
						attempt >= 3
					)
						throw error;
				}
			}
		});
		this.mutations = pending.then(
			() => undefined,
			() => undefined,
		);
		return pending;
	}

	async readDataset(): Promise<Dataset> {
		return this.prisma.$transaction((tx) => readDataset(tx), {
			timeout: 30_000,
			isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
		});
	}

	/** Populate an empty database only. A restart must preserve goals and history. */
	async seed(dataset: Dataset): Promise<void> {
		await this.write(async (tx) => {
			if (await tx.datasetMeta.findUnique({ where: { key: "as_of_date" } }))
				return;
			validateDataset(dataset);
			await tx.employee.createMany({
				data: dataset.employees.map(employeeRow),
			});
			await tx.event.createMany({
				data: dataset.events.map((event) => ({
					id: event.event_id,
					payload: json(event),
				})),
			});
			await tx.skill.createMany({
				data: dataset.skills.map((skill) => ({
					id: skill.skill_id,
					payload: json(skill),
				})),
			});
			await tx.roleProfile.createMany({
				data: dataset.role_profiles.map((role) => ({
					role: role.role,
					grade: role.grade,
					payload: json(role),
				})),
			});
			await tx.history.createMany({ data: dataset.history.map(historyRow) });
			await tx.datasetMeta.create({
				data: { key: "as_of_date", value: dataset.as_of_date },
			});
		});
	}

	async importData(
		employeesJson: string,
		historyCsv: string,
	): Promise<{ employees: number; history: number; message: string }> {
		return this.write(async (tx) => {
			const merged = mergeImport(
				await readDataset(tx),
				employeesJson,
				historyCsv,
			);
			// Existing accounts reference stable Employee IDs, never an imported role.
			for (const employee of merged.dataset.employees) {
				const row = employeeRow(employee);
				await tx.employee.upsert({
					where: { id: row.id },
					create: row,
					update: { payload: row.payload },
				});
			}
			// A validated import can replace/swap compound participation keys. Rebuild
			// just the history in this transaction to avoid transient unique conflicts.
			await tx.history.deleteMany();
			await tx.history.createMany({
				data: merged.dataset.history.map(historyRow),
			});
			return {
				employees: merged.employees,
				history: merged.history,
				message: "Данные успешно загружены.",
			};
		});
	}

	async updateGoal(id: string, goal: Goal | null): Promise<Profile> {
		return this.write(async (tx) => {
			const dataset = await readDataset(tx);
			const employee = findEmployee(dataset, id);
			if (
				goal &&
				!dataset.role_profiles.some(
					(profile) =>
						profile.role === goal.target_role &&
						profile.grade === goal.target_grade,
				)
			) {
				throw new Error("Для выбранной роли и грейда нет профиля требований.");
			}
			employee.career_goal = goal;
			await tx.employee.update({
				where: { id },
				data: { payload: json(employee) },
			});
			return profileFor(dataset, id);
		});
	}

	async completeActivity(
		id: string,
		eventId: string,
	): Promise<{ profile: Profile; already_completed: boolean }> {
		return this.write(async (tx) => {
			const dataset = await readDataset(tx);
			findEmployee(dataset, id);
			const event = dataset.events.find(
				(candidate) => candidate.event_id === eventId,
			);
			if (!event) throw new Error("Мероприятие не найдено.");
			if (event.mandatory)
				throw new Error(
					"Обязательные мероприятия недоступны для этого сценария завершения.",
				);
			const history = dataset.history.filter(
				(row) => row.employee_id === id && row.event_id === eventId,
			);
			const completed = history.some(
				(row) =>
					row.status === "completed" &&
					(eventId !== "EV_036" ||
						row.date === dataset.as_of_date ||
						row.completed_at?.slice(0, 10) === dataset.as_of_date),
			);
			if (completed)
				return { profile: profileFor(dataset, id), already_completed: true };
			if (
				!candidatesFor(dataset, id).some(
					(candidate) => candidate.event.event_id === eventId,
				)
			) {
				throw new Error(
					"Мероприятие недоступно для текущего профиля и карьерной цели.",
				);
			}

			const previous =
				history
					.filter((row) => row.status === "in_progress")
					.sort(
						(a, b) =>
							b.date.localeCompare(a.date) ||
							b.record_id.localeCompare(a.record_id),
					)[0] ?? history.find((row) => row.date === dataset.as_of_date);
			const completion: History = {
				...(previous ?? {
					record_id: `demo_${crypto.randomUUID()}`,
					employee_id: id,
					event_id: eventId,
					date: dataset.as_of_date,
					due_date: null,
					score: null,
					feedback_rating: null,
					assigned_by: "self" as const,
				}),
				status: "completed",
				completion_pct: 100,
				completed_at: `${dataset.as_of_date}T12:00:00.000Z`,
			};
			const row = historyRow(completion);
			if (previous) {
				dataset.history[
					dataset.history.findIndex(
						(item) => item.record_id === previous.record_id,
					)
				] = completion;
				await tx.history.update({
					where: { id: row.id },
					data: { payload: row.payload },
				});
			} else {
				dataset.history.push(completion);
				await tx.history.create({ data: row });
			}
			return { profile: profileFor(dataset, id), already_completed: false };
		});
	}

	async close(): Promise<void> {
		await this.mutations;
		await this.prisma.$disconnect();
	}
}

function json(value: object): Prisma.InputJsonValue {
	return value as unknown as Prisma.InputJsonValue;
}

function employeeRow(employee: Employee) {
	return { id: employee.employee_id, payload: json(employee) };
}

function historyRow(history: History) {
	return {
		id: history.record_id,
		employeeId: history.employee_id,
		eventId: history.event_id,
		date: history.date,
		payload: json(history),
	};
}

function findEmployee(dataset: Dataset, id: string): Employee {
	const employee = dataset.employees.find(
		(employee) => employee.employee_id === id,
	);
	if (!employee) throw new Error("Сотрудник не найден.");
	return employee;
}

async function readDataset(tx: Prisma.TransactionClient): Promise<Dataset> {
	const [meta, employees, events, skills, roles, history] = await Promise.all([
		tx.datasetMeta.findUnique({ where: { key: "as_of_date" } }),
		tx.employee.findMany({ orderBy: { id: "asc" } }),
		tx.event.findMany({ orderBy: { id: "asc" } }),
		tx.skill.findMany({ orderBy: { id: "asc" } }),
		tx.roleProfile.findMany({ orderBy: [{ role: "asc" }, { grade: "asc" }] }),
		tx.history.findMany({ orderBy: { id: "asc" } }),
	]);
	if (!meta || typeof meta.value !== "string")
		throw new Error("Датасет еще не загружен.");
	return {
		as_of_date: meta.value,
		employees: employees.map((row) => row.payload as unknown as Employee),
		events: events.map((row) => row.payload as unknown as Event),
		skills: skills.map((row) => row.payload as unknown as Skill),
		role_profiles: roles.map((row) => row.payload as unknown as RoleProfile),
		history: history.map((row) => row.payload as unknown as History),
	};
}
