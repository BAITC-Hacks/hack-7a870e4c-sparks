import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import type { Dataset, Employee, History } from "../../contracts";

const grades = ["Junior", "Middle", "Senior", "Lead"];
const statuses = [
	"completed",
	"in_progress",
	"dropped",
	"no_show",
	"declined",
	"overdue",
];
const columns = [
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
];
const maxImportBytes = 8 * 1024 * 1024;

function check(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function object(value: unknown, field: string): Record<string, unknown> {
	check(
		value !== null && typeof value === "object" && !Array.isArray(value),
		`Поле ${field} должно быть объектом.`,
	);
	return value as Record<string, unknown>;
}

function string(value: unknown, field: string): asserts value is string {
	check(
		typeof value === "string" &&
			value.trim().length > 0 &&
			value.length <= 10_000 &&
			!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
		`Поле ${field} должно содержать непустой текст допустимой длины.`,
	);
}

function id(value: unknown, field: string): asserts value is string {
	check(
		typeof value === "string" &&
			/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value) &&
			!["__proto__", "prototype", "constructor"].includes(value),
		`Поле ${field} содержит некорректный идентификатор.`,
	);
}

function integer(
	value: unknown,
	min: number,
	max: number,
	field: string,
): void {
	check(
		typeof value === "number" &&
			Number.isInteger(value) &&
			value >= min &&
			value <= max,
		`Поле ${field} должно быть целым числом от ${min} до ${max}.`,
	);
}

function date(value: unknown, field: string): asserts value is string {
	check(
		typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
		`Поле ${field} должно быть датой YYYY-MM-DD.`,
	);
	const parsed = new Date(`${value}T00:00:00.000Z`);
	check(
		Number.isFinite(parsed.getTime()) &&
			parsed.toISOString().slice(0, 10) === value,
		`Поле ${field} содержит несуществующую календарную дату.`,
	);
}

function unique(values: string[], field: string): void {
	check(
		new Set(values).size === values.length,
		`В поле ${field} обнаружены дубликаты.`,
	);
}

function strings(
	value: unknown,
	field: string,
	allowEmpty = true,
): asserts value is string[] {
	check(
		Array.isArray(value) && (allowEmpty || value.length > 0),
		`Поле ${field} должно быть массивом.`,
	);
	for (const item of value) string(item, field);
	unique(value, field);
}

function skillLevels(
	value: unknown,
	skillIds: Set<string>,
	field: string,
): void {
	const levels = object(value, field);
	for (const [skillId, level] of Object.entries(levels)) {
		check(
			skillIds.has(skillId),
			`Поле ${field} ссылается на неизвестный навык.`,
		);
		integer(level, 0, 5, field);
	}
}

/** Validate the merged dataset before any persistence, including unchanged references. */
export function validateDataset(data: Dataset): void {
	object(data, "dataset");
	date(data.as_of_date, "as_of_date");
	for (const key of [
		"employees",
		"events",
		"skills",
		"role_profiles",
		"history",
	] as const) {
		check(Array.isArray(data[key]), `Поле ${key} должно быть массивом.`);
		for (const row of data[key]) object(row, key);
	}
	check(
		data.skills.length > 0 && data.role_profiles.length > 0,
		"Каталоги навыков и требований не могут быть пустыми.",
	);
	const skillIds = new Set<string>();
	for (const skill of data.skills) {
		id(skill.skill_id, "skill_id");
		check(
			!skillIds.has(skill.skill_id),
			"Каталог содержит повторяющийся skill_id.",
		);
		skillIds.add(skill.skill_id);
		string(skill.name, "skill.name");
		string(skill.description, "skill.description");
		string(skill.category, "skill.category");
		check(["hard", "soft"].includes(skill.type), "Неизвестный тип навыка.");
	}
	const roleKeys = new Set<string>();
	const roles = new Set<string>();
	for (const profile of data.role_profiles) {
		string(profile.role, "role");
		check(
			grades.includes(profile.grade),
			"Неизвестный грейд в профиле требований.",
		);
		const key = JSON.stringify([profile.role, profile.grade]);
		check(!roleKeys.has(key), "Профиль роли и грейда повторяется.");
		roleKeys.add(key);
		roles.add(profile.role);
		skillLevels(profile.required_skills, skillIds, "required_skills");
		strings(profile.critical_skills, "critical_skills");
		check(
			profile.critical_skills.every(
				(skillId) =>
					skillIds.has(skillId) &&
					Object.hasOwn(profile.required_skills, skillId),
			),
			"Критический навык должен входить в требования роли.",
		);
	}
	for (const role of roles) {
		let previous: Record<string, number> = {};
		for (const grade of grades) {
			const profile = data.role_profiles.find(
				(item) => item.role === role && item.grade === grade,
			);
			if (!profile) continue;
			check(
				Object.entries(previous).every(
					([skill, level]) => (profile.required_skills[skill] ?? 0) >= level,
				),
				"Требования к навыкам не могут снижаться при повышении грейда.",
			);
			previous = profile.required_skills;
		}
	}
	const employeeIds = new Set<string>();
	for (const employee of data.employees) {
		id(employee.employee_id, "employee_id");
		check(
			employee.employee_id !== "hr",
			"ID hr зарезервирован для аккаунта HR и не может быть ID сотрудника.",
		);
		check(
			!employeeIds.has(employee.employee_id),
			"В профилях обнаружен повторяющийся employee_id.",
		);
		employeeIds.add(employee.employee_id);
		string(employee.full_name, "full_name");
		string(employee.department, "department");
		check(
			roleKeys.has(JSON.stringify([employee.role, employee.grade])),
			"У сотрудника указана неизвестная роль или грейд.",
		);
		check(
			employee.manager_id === null || typeof employee.manager_id === "string",
			"Некорректный manager_id.",
		);
		date(employee.hire_date, "hire_date");
		date(employee.last_review_date, "last_review_date");
		check(
			employee.hire_date <= employee.last_review_date &&
				employee.last_review_date <= data.as_of_date,
			"Даты найма и оценки должны следовать в хронологическом порядке и не быть позже даты среза.",
		);
		integer(employee.tenure_months, 0, 1_200, "tenure_months");
		check(
			["office", "hybrid", "remote"].includes(employee.work_format),
			"Неизвестный формат работы.",
		);
		check(
			["ru", "kk", "en"].includes(employee.preferred_language),
			"Неизвестный язык интерфейса.",
		);
		if (employee.career_goal !== null) {
			object(employee.career_goal, "career_goal");
			check(
				roleKeys.has(
					JSON.stringify([
						employee.career_goal.target_role,
						employee.career_goal.target_grade,
					]),
				),
				"Карьерная цель ссылается на неизвестную роль или грейд.",
			);
		}
		skillLevels(employee.skills, skillIds, "employee.skills");
	}
	const employees = new Map(
		data.employees.map((item) => [item.employee_id, item]),
	);
	for (const employee of data.employees) {
		if (employee.manager_id === null) continue;
		const manager = employees.get(employee.manager_id);
		check(
			manager &&
				manager.employee_id !== employee.employee_id &&
				manager.grade === "Lead",
			"Руководитель должен ссылаться на другого существующего сотрудника грейда Lead.",
		);
		// Imported jury examples intentionally use another department; only the reference is authoritative.
	}
	const eventIds = new Set<string>();
	for (const event of data.events) {
		id(event.event_id, "event_id");
		check(
			!eventIds.has(event.event_id),
			"Каталог содержит повторяющийся event_id.",
		);
		eventIds.add(event.event_id);
		string(event.title, "event.title");
		string(event.description, "event.description");
		check(
			[
				"compliance",
				"onboarding",
				"course",
				"workshop",
				"mentoring",
				"certification",
				"meetup",
			].includes(event.type),
			"Неизвестный тип мероприятия.",
		);
		check(
			["online", "offline", "self_paced"].includes(event.format),
			"Неизвестный формат мероприятия.",
		);
		check(
			typeof event.duration_hours === "number" &&
				Number.isFinite(event.duration_hours) &&
				event.duration_hours > 0,
			"Продолжительность мероприятия должна быть положительным числом.",
		);
		check(
			typeof event.mandatory === "boolean",
			"Поле mandatory должно быть логическим значением.",
		);
		strings(event.target_roles, "target_roles", false);
		strings(event.target_grades, "target_grades", false);
		check(
			event.target_roles.every((role) => roles.has(role)) &&
				event.target_grades.every((grade) => grades.includes(grade)),
			"Аудитория мероприятия содержит неизвестную роль или грейд.",
		);
		skillLevels(event.prerequisites, skillIds, "prerequisites");
		check(
			Array.isArray(event.develops_skills),
			"Поле develops_skills должно быть массивом.",
		);
		for (const gain of event.develops_skills) {
			object(gain, "develops_skills");
			check(
				skillIds.has(gain.skill_id),
				"Мероприятие развивает неизвестный навык.",
			);
			integer(gain.gain, 0, 5, "gain");
			integer(gain.max_level, 0, 5, "max_level");
		}
		unique(
			event.develops_skills.map((item) => item.skill_id),
			"develops_skills",
		);
		strings(event.upcoming_sessions, "upcoming_sessions");
		for (const session of event.upcoming_sessions)
			date(session, "upcoming_sessions");
		check(
			event.format !== "self_paced" || event.upcoming_sessions.length === 0,
			"Самостоятельное обучение не должно содержать сессии по расписанию.",
		);
	}
	const events = new Map(data.events.map((item) => [item.event_id, item]));
	const recordIds = new Set<string>();
	const participations = new Set<string>();
	const historyGroups = new Map<string, History[]>();
	for (const record of data.history) {
		id(record.record_id, "record_id");
		check(
			!recordIds.has(record.record_id),
			"История содержит повторяющийся record_id.",
		);
		recordIds.add(record.record_id);
		const employee = employees.get(record.employee_id);
		const event = events.get(record.event_id);
		check(
			employee && event,
			"История ссылается на неизвестного сотрудника или мероприятие.",
		);
		date(record.date, "history.date");
		check(
			record.date >= employee.hire_date && record.date <= data.as_of_date,
			"Дата участия должна быть между датой найма и датой среза.",
		);
		const participation = JSON.stringify([
			record.employee_id,
			record.event_id,
			record.date,
		]);
		check(
			!participations.has(participation),
			"Повторяется участие сотрудника в одном мероприятии за одну дату.",
		);
		participations.add(participation);
		check(statuses.includes(record.status), "Неизвестный статус участия.");
		integer(record.completion_pct, 0, 100, "completion_pct");
		const progressValid =
			record.status === "completed"
				? record.completion_pct === 100
				: ["no_show", "declined"].includes(record.status)
					? record.completion_pct === 0
					: record.status === "dropped"
						? record.completion_pct >= 5 && record.completion_pct <= 95
						: record.completion_pct <= 95;
		check(
			progressValid,
			"Процент выполнения не соответствует статусу участия.",
		);
		check(
			["self", "manager", "hr"].includes(record.assigned_by),
			"Неизвестный инициатор участия.",
		);
		check(
			record.status !== "declined" || record.assigned_by !== "self",
			"Отказ допустим только от назначения HR или руководителя.",
		);
		check(
			record.status !== "no_show" || event.format !== "self_paced",
			"Статус no_show допустим только для мероприятий по расписанию.",
		);
		if (record.due_date !== null) {
			date(record.due_date, "due_date");
			check(
				event.mandatory && record.due_date >= record.date,
				"Срок допустим только для обязательного мероприятия и не раньше участия.",
			);
		}
		check(
			record.status !== "overdue" ||
				(event.mandatory &&
					record.due_date !== null &&
					record.due_date < data.as_of_date),
			"Просрочка требует обязательного мероприятия и истёкшего срока.",
		);
		if (record.score !== null) {
			integer(record.score, 0, 100, "score");
			check(
				record.status === "completed" &&
					["course", "certification", "compliance"].includes(event.type),
				"Итоговая оценка допустима только для завершённого курса, сертификации или compliance.",
			);
		}
		if (record.feedback_rating !== null)
			integer(record.feedback_rating, 1, 5, "feedback_rating");
		if (record.completed_at !== undefined && record.completed_at !== null) {
			check(
				typeof record.completed_at === "string" &&
					/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
						record.completed_at,
					),
				"completed_at должен быть временем UTC в формате YYYY-MM-DDTHH:mm:ss.sssZ.",
			);
			const time = new Date(record.completed_at);
			check(
				Number.isFinite(time.getTime()) &&
					time.toISOString() === record.completed_at &&
					record.status === "completed" &&
					record.completed_at.slice(0, 10) >= record.date &&
					record.completed_at.slice(0, 10) <= data.as_of_date,
				"Время завершения не соответствует статусу, дате участия или дате среза.",
			);
		}
		const key = JSON.stringify([record.employee_id, record.event_id]);
		const group = historyGroups.get(key) ?? [];
		group.push(record);
		historyGroups.set(key, group);
	}
	for (const records of historyGroups.values()) {
		const event = events.get(records[0]!.event_id)!;
		if (event.mandatory || event.event_id === "EV_036") continue;
		let completed = false;
		for (const record of [...records].sort(
			(a, b) =>
				a.date.localeCompare(b.date) || a.record_id.localeCompare(b.record_id),
		)) {
			check(
				!completed,
				"Добровольное мероприятие нельзя повторять после завершения; исключение — регулярный клуб EV_036.",
			);
			completed = record.status === "completed";
		}
	}
}

function parseJson(text: string, field: string): Record<string, unknown> {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error(`Файл ${field} содержит некорректный JSON.`);
	}
	return object(value, field);
}

function readMeta(
	document: Record<string, unknown>,
	expected?: string,
): string {
	const meta = object(document.meta, "meta");
	date(meta.as_of_date, "meta.as_of_date");
	check(
		!expected || meta.as_of_date === expected,
		"Дата среза импортируемых данных не совпадает с текущим набором.",
	);
	return meta.as_of_date;
}

function csvNumber(
	value: string,
	field: string,
	nullable: boolean,
): number | null {
	if (nullable && value === "") return null;
	check(
		/^\d+$/.test(value),
		`CSV: поле ${field} должно содержать целое число.`,
	);
	return Number(value);
}

function parseHistory(text: string): History[] {
	if (!text.trim()) return [];
	let rows: string[][];
	try {
		rows = parse(text, {
			bom: true,
			skip_empty_lines: true,
			relax_column_count: false,
		}) as string[][];
	} catch {
		throw new Error("CSV истории содержит некорректные строки или кавычки.");
	}
	const header = rows.shift();
	check(header && header.length > 0, "CSV истории не содержит заголовок.");
	unique(header, "CSV-заголовок");
	check(
		columns.every((name) => header.includes(name)) &&
			header.every((name) => columns.includes(name) || name === "completed_at"),
		"CSV должен содержать исходные 10 колонок и, при необходимости, completed_at; неизвестные колонки запрещены.",
	);
	return rows.map((row) => {
		const values = Object.fromEntries(
			header.map((name, index) => [name, row[index]!]),
		);
		return {
			record_id: values.record_id!,
			employee_id: values.employee_id!,
			event_id: values.event_id!,
			date: values.date!,
			due_date: values.due_date || null,
			status: values.status as History["status"],
			completion_pct: csvNumber(
				values.completion_pct!,
				"completion_pct",
				false,
			)!,
			score: csvNumber(values.score!, "score", true),
			feedback_rating: csvNumber(
				values.feedback_rating!,
				"feedback_rating",
				true,
			),
			assigned_by: values.assigned_by as History["assigned_by"],
			...(header.includes("completed_at")
				? { completed_at: values.completed_at || null }
				: {}),
		};
	});
}

export async function loadDataset(directory: string): Promise<Dataset> {
	let files: string[];
	try {
		files = await Promise.all(
			[
				"employees.json",
				"events.json",
				"skills.json",
				"activity_history.csv",
			].map((name) => readFile(join(directory, name), "utf8")),
		);
	} catch {
		throw new Error("Не удалось прочитать файлы исходного датасета.");
	}
	const employees = parseJson(files[0]!, "employees.json");
	const events = parseJson(files[1]!, "events.json");
	const skills = parseJson(files[2]!, "skills.json");
	const asOfDate = readMeta(employees);
	readMeta(events, asOfDate);
	readMeta(skills, asOfDate);
	const dataset = {
		as_of_date: asOfDate,
		employees: employees.employees,
		events: events.events,
		skills: skills.skills,
		role_profiles: skills.role_profiles,
		history: parseHistory(files[3]!),
	} as Dataset;
	validateDataset(dataset);
	return dataset;
}

export function mergeImport(
	current: Dataset,
	employeesJson: string,
	historyCsv: string,
): {
	dataset: Dataset;
	employees: number;
	history: number;
} {
	check(
		typeof employeesJson === "string" && typeof historyCsv === "string",
		"Импорт принимает содержимое JSON и CSV как текст.",
	);
	check(
		new TextEncoder().encode(employeesJson).length +
			new TextEncoder().encode(historyCsv).length <=
			maxImportBytes,
		"Общий размер импортируемых файлов превышает 8 МиБ.",
	);
	check(
		employeesJson.trim() || historyCsv.trim(),
		"Выберите хотя бы один непустой файл для импорта.",
	);
	let importedEmployees: Employee[] = [];
	if (employeesJson.trim()) {
		const document = parseJson(employeesJson, "employees.json");
		if (document.meta !== undefined) readMeta(document, current.as_of_date);
		check(
			Array.isArray(document.employees),
			"JSON должен содержать массив employees.",
		);
		for (const employee of document.employees) {
			object(employee, "employees");
			id(employee.employee_id, "employee_id");
		}
		importedEmployees = document.employees as Employee[];
		unique(
			importedEmployees.map((item) => item.employee_id),
			"импортируемые employee_id",
		);
	}
	const importedHistory = parseHistory(historyCsv);
	unique(
		importedHistory.map((item) => item.record_id),
		"импортируемые record_id",
	);
	const employees = new Map(
		current.employees.map((item) => [item.employee_id, item]),
	);
	const history = new Map(
		current.history.map((item) => [item.record_id, item]),
	);
	for (const employee of importedEmployees)
		employees.set(employee.employee_id, employee);
	for (const record of importedHistory) history.set(record.record_id, record);
	const dataset: Dataset = {
		...current,
		employees: [...employees.values()],
		history: [...history.values()],
	};
	validateDataset(dataset);
	return {
		dataset,
		employees: importedEmployees.length,
		history: importedHistory.length,
	};
}
