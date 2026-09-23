import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Dataset, Employee, History } from "../src/contracts";
import {
	loadDataset,
	mergeImport,
	validateDataset,
} from "../src/utils/dataset";
import {
	candidatesFor,
	eventBlockedReasons,
	hrOverview,
	noStepReason,
	profileFor,
} from "../src/modules/employees/service";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const dataset = await loadDataset(`${root}case_1/career_quest_dataset`);
const juryJson = await readFile(`${root}examples/jury/employees.json`, "utf8");
const juryCsv = await readFile(
	`${root}examples/jury/activity_history.csv`,
	"utf8",
);
const jury = mergeImport(dataset, juryJson, juryCsv).dataset;
const csvHeader =
	"record_id,employee_id,event_id,date,due_date,status,completion_pct,score,feedback_rating,assigned_by";

describe("Career Quest: исходные данные и расчёт состояния", () => {
	test("читает оригинальный набор с ежегодными обязательными повторами", () => {
		expect(dataset.as_of_date).toBe("2026-10-01");
		expect(dataset.employees).toHaveLength(200);
		expect(dataset.skills).toHaveLength(60);
		expect(dataset.role_profiles).toHaveLength(32);
		expect(dataset.events).toHaveLength(40);
		expect(dataset.history).toHaveLength(2743);
		expect(() => validateDataset(dataset)).not.toThrow();
	});

	test("ограничение max_level не понижает уже имеющийся навык", () => {
		const profile = profileFor(dataset, "E0003");
		expect(profile.employee.skills.SK_COMMUNICATION).toBe(4);
		expect(profile.effective_skills.SK_COMMUNICATION).toBeGreaterThanOrEqual(4);
		expect(profile.target_source).toBe("next_grade");
		expect(profileFor(dataset, "E0003").effective_skills).toEqual(
			profile.effective_skills,
		);
	});

	test("сохраняет явную смену роли и не создаёт грейд выше Lead", () => {
		expect(profileFor(dataset, "E0004").target).toEqual({
			target_role: "Product Manager",
			target_grade: "Middle",
		});
		const lead = profileFor(dataset, "E0006");
		expect(lead.target).toBeNull();
		expect(lead.readiness).toBeNull();
		expect(candidatesFor(dataset, "E0006")).toHaveLength(0);
		expect(noStepReason(dataset, lead)).toContain("нет следующей ступени");
	});

	test("не выдумывает покрытие Test Design и объясняет ограничение", () => {
		const profile = profileFor(dataset, "E0066");
		expect(
			profile.gaps.find((gap) => gap.skill_id === "SK_TEST_DESIGN"),
		).toMatchObject({ critical: false, covered: false });
		expect(
			profile.warnings.some((message) => message.includes("Test Design")),
		).toBe(true);
	});

	test("новые профили получают прирост после оценки, старые завершения не считаются снова", () => {
		const backend = profileFor(jury, "JURY_BACKEND_ALPHA");
		expect(backend.employee.skills.SK_PYTHON).toBe(1);
		expect(backend.effective_skills.SK_PYTHON).toBe(2);
		expect(
			backend.history.filter((item) => item.event_id === "EV_001"),
		).toHaveLength(2);
		const qa = profileFor(jury, "JURY_QA_BETA");
		expect(qa.effective_skills.SK_API_TESTING).toBe(4);
		expect(qa.effective_skills.SK_LOAD_TESTING).toBe(3);
		expect(
			candidatesFor(jury, "JURY_BACKEND_ALPHA").some(
				(candidate) => candidate.event.event_id === "EV_012",
			),
		).toBe(false);
		expect(
			candidatesFor(jury, "JURY_QA_BETA").some(
				(candidate) => candidate.event.event_id === "EV_018",
			),
		).toBe(true);
	});

	test("точное время завершения учитывает обучение, начатое до последней оценки", () => {
		const copy = structuredClone(jury);
		const record = copy.history.find(
			(item) => item.record_id === "JURY_ALPHA_001",
		)!;
		record.date = "2026-08-20";
		delete record.completed_at;
		expect(
			profileFor(copy, "JURY_BACKEND_ALPHA").effective_skills.SK_PYTHON,
		).toBe(1);
		expect(
			profileFor(copy, "JURY_BACKEND_ALPHA").warnings.some((message) =>
				message.includes("недоучтён"),
			),
		).toBe(true);
		record.completed_at = "2026-09-01T12:00:00.000Z";
		validateDataset(copy);
		expect(
			profileFor(copy, "JURY_BACKEND_ALPHA").effective_skills.SK_PYTHON,
		).toBe(2);
		record.completed_at = "2026-09-01T00:00:00.000Z";
		expect(
			profileFor(copy, "JURY_BACKEND_ALPHA").effective_skills.SK_PYTHON,
		).toBe(1);
	});

	test("отсутствующий навык равен нулю и превышение другого не компенсирует дефицит", () => {
		const copy = structuredClone(jury);
		const employee = copy.employees.find(
			(item) => item.employee_id === "JURY_BACKEND_ALPHA",
		)!;
		employee.skills = {};
		copy.history = copy.history.filter(
			(item) => item.employee_id !== employee.employee_id,
		);
		const empty = profileFor(copy, employee.employee_id);
		expect(empty.readiness).toBe(0);
		expect(empty.gaps.every((gap) => gap.current === 0)).toBe(true);
		employee.skills.SK_PYTHON = 5;
		const profile = profileFor(copy, employee.employee_id);
		const requirements = copy.role_profiles.find(
			(item) =>
				item.role === profile.target!.target_role &&
				item.grade === profile.target!.target_grade,
		)!;
		const total = Object.values(requirements.required_skills).reduce(
			(sum, level) => sum + level,
			0,
		);
		expect(profile.readiness).toBe(
			Math.round((requirements.required_skills.SK_PYTHON! / total) * 1000) / 10,
		);
	});

	test("исторический обязательный onboarding добавляет навык после оценки", () => {
		const profile = profileFor(dataset, "E0058");
		expect(profile.employee.skills.SK_PRODUCT_KNOWLEDGE).toBeUndefined();
		expect(profile.effective_skills.SK_PRODUCT_KNOWLEDGE).toBe(1);
		expect(
			candidatesFor(dataset, "E0058").some(
				(candidate) => candidate.event.event_id === "EV_004",
			),
		).toBe(false);
	});
});

describe("допустимость рекомендаций и HR", () => {
	test("prerequisites блокируют продвинутые занятия, история прекращения объяснена", () => {
		const candidates = candidatesFor(dataset, "E0002");
		expect(
			candidates.some((item) =>
				["EV_006", "EV_007"].includes(item.event.event_id),
			),
		).toBe(false);
		const next = candidates.find((item) => item.event.event_id === "EV_005")!;
		expect(next).toBeDefined();
		expect(
			next.factors.find((factor) => factor.category === "history")!.text,
		).toContain("прекращено");
		expect(new Set(next.factors.map((factor) => factor.category)).size).toBe(4);
	});

	test("все сотрудники получают только добровольные шаги для текущей аудитории", () => {
		for (const employee of dataset.employees) {
			const profile = profileFor(dataset, employee.employee_id);
			for (const candidate of candidatesFor(dataset, employee.employee_id)) {
				expect(candidate.event.mandatory).toBe(false);
				expect(candidate.event.target_roles).toContain(employee.role);
				expect(candidate.event.target_grades).toContain(employee.grade);
				expect(
					candidate.gains.some(
						(gain) => gain.after > gain.before && gain.target > gain.before,
					),
				).toBe(true);
				for (const [skill, required] of Object.entries(
					candidate.event.prerequisites,
				)) {
					expect(profile.effective_skills[skill] ?? 0).toBeGreaterThanOrEqual(
						required,
					);
				}
				if (candidate.event.format !== "self_paced")
					expect(candidate.next_session! >= dataset.as_of_date).toBe(true);
			}
		}
	});

	test("отсутствие будущей сессии исключает мероприятие, self-paced сохраняет доступность", () => {
		const copy = structuredClone(jury);
		for (const event of copy.events) event.upcoming_sessions = [];
		expect(
			candidatesFor(copy, "JURY_QA_BETA").every(
				(candidate) => candidate.event.format === "self_paced",
			),
		).toBe(true);
		expect(
			candidatesFor(copy, "E0008").some(
				(candidate) => candidate.event.event_id === "EV_009",
			),
		).toBe(true);
	});

	test("HR агрегирует записи участия, включая обязательные ежегодные повторы", () => {
		const overview = hrOverview(dataset);
		expect(overview.total_employees).toBe(200);
		expect(
			overview.participation.reduce((sum, event) => sum + event.total, 0),
		).toBe(2743);
		expect(
			overview.participation.reduce((sum, event) => sum + event.completed, 0),
		).toBe(2178);
		expect(
			overview.participation.find((event) => event.event_id === "EV_001")!
				.total,
		).toBeGreaterThan(200);
		expect(
			overview.employees_without_step.some(
				(employee) => employee.employee_id === "E0006",
			),
		).toBe(true);
		expect(
			overview.skill_gaps.some((gap) => gap.skill_id === "SK_TEST_DESIGN"),
		).toBe(true);
	});

	test("регулярный клуб допускает повтор, но не два завершения в виртуальный день", () => {
		const copy = structuredClone(dataset);
		const employee = copy.employees.find(
			(item) => item.employee_id === "E0002",
		)!;
		const event = copy.events.find((item) => item.event_id === "EV_036")!;
		const record: History = {
			record_id: "RECURRING_TEST",
			employee_id: employee.employee_id,
			event_id: event.event_id,
			date: employee.last_review_date,
			due_date: null,
			status: "completed",
			completion_pct: 100,
			score: null,
			feedback_rating: null,
			assigned_by: "self",
		};
		copy.history.push(record);
		validateDataset(copy);
		expect(
			eventBlockedReasons(copy, profileFor(copy, employee.employee_id), event),
		).toEqual([]);
		record.completed_at = `${copy.as_of_date}T12:00:00.000Z`;
		validateDataset(copy);
		expect(
			eventBlockedReasons(copy, profileFor(copy, employee.employee_id), event),
		).toContain("мероприятие уже завершено");
	});
});

describe("импорт объединённого набора", () => {
	test("принимает примеры жюри и повторный импорт идемпотентен по ID", () => {
		const first = mergeImport(dataset, juryJson, juryCsv);
		expect(first.employees).toBe(2);
		expect(first.history).toBe(6);
		expect(first.dataset.employees).toHaveLength(202);
		expect(first.dataset.history).toHaveLength(2749);
		const repeated = mergeImport(first.dataset, juryJson, juryCsv);
		expect(repeated.dataset).toEqual(first.dataset);
		expect(dataset.employees).toHaveLength(200);
		expect(dataset.history).toHaveLength(2743);
	});

	test("заменяет профиль целиком и проверяет ссылки после объединения", () => {
		const employee: Employee = structuredClone(
			jury.employees.find((item) => item.employee_id === "JURY_BACKEND_ALPHA")!,
		);
		employee.full_name = "Обновлённый синтетический профиль";
		employee.skills = {};
		const imported = mergeImport(
			jury,
			JSON.stringify({ employees: [employee] }),
			"",
		);
		expect(imported.dataset.employees).toHaveLength(202);
		expect(
			profileFor(imported.dataset, employee.employee_id).employee.skills,
		).toEqual({});
		employee.manager_id = "UNKNOWN_MANAGER";
		expect(() =>
			mergeImport(jury, JSON.stringify({ employees: [employee] }), ""),
		).toThrow("Руководитель");
	});

	test("отклоняет неоднозначные CSV-колонки, пропуски и неверные числовые поля", () => {
		expect(() => mergeImport(dataset, "", `${csvHeader},extra\n`)).toThrow(
			"колонок",
		);
		expect(() => mergeImport(dataset, "", `${csvHeader},score\n`)).toThrow(
			"дубликаты",
		);
		expect(() =>
			mergeImport(dataset, "", "record_id,employee_id\nA,E0001"),
		).toThrow("колонок");
		expect(() =>
			mergeImport(
				dataset,
				"",
				`${csvHeader}\nX,E0001,EV_036,2026-09-01,,completed,1e2,,,self`,
			),
		).toThrow("целое число");
	});

	test("отклоняет дату другого среза и неправильные JSON-типы", () => {
		expect(() =>
			mergeImport(
				dataset,
				JSON.stringify({ meta: { as_of_date: "2026-10-02" }, employees: [] }),
				"",
			),
		).toThrow("Дата среза");
		expect(() => mergeImport(dataset, "[]", "")).toThrow("объектом");
		expect(() => mergeImport(dataset, "{broken", "")).toThrow("JSON");
		expect(() =>
			mergeImport(dataset, JSON.stringify({ employees: [null] }), ""),
		).toThrow("объектом");
	});

	test("запрещает ID аккаунта HR до импорта, не позволяя сломать следующий запуск", () => {
		const employee = structuredClone(dataset.employees[0]!);
		employee.employee_id = "hr";
		expect(() =>
			mergeImport(dataset, JSON.stringify({ employees: [employee] }), ""),
		).toThrow("зарезервирован");
		expect(() =>
			validateDataset({
				...dataset,
				employees: [...dataset.employees, employee],
			}),
		).toThrow("зарезервирован");
		expect(dataset.employees).toHaveLength(200);
	});

	test("ошибка одной строки отклоняет целый запрос без изменения исходных данных", () => {
		const invalidCsv = `${juryCsv.trim()}\nBROKEN,JURY_BACKEND_ALPHA,UNKNOWN_EVENT,2026-09-28,,completed,100,,,self\n`;
		expect(() => mergeImport(dataset, juryJson, invalidCsv)).toThrow(
			"неизвестного сотрудника или мероприятие",
		);
		expect(dataset.employees).toHaveLength(200);
		expect(dataset.history).toHaveLength(2743);
	});

	test("отклоняет дубли внутри файла, повтор участия и повтор добровольного завершения", () => {
		const document = JSON.parse(juryJson);
		document.employees.push(document.employees[0]);
		expect(() => mergeImport(dataset, JSON.stringify(document), "")).toThrow(
			"дубликаты",
		);
		const duplicate = `${csvHeader}\nOTHER,JURY_BACKEND_ALPHA,EV_012,2026-09-20,,completed,100,,,self`;
		expect(() => mergeImport(jury, "", duplicate)).toThrow(
			"Повторяется участие",
		);
		const repeated = `${csvHeader}\nOTHER,JURY_BACKEND_ALPHA,EV_012,2026-09-22,,completed,100,,,self`;
		expect(() => mergeImport(jury, "", repeated)).toThrow("нельзя повторять");
	});

	test.each([
		["несуществующая дата", { date: "2026-02-30" }, "календарную дату"],
		["несовместимый процент", { completion_pct: 95 }, "Процент выполнения"],
		[
			"no_show self-paced",
			{ status: "no_show", completion_pct: 0, score: null },
			"no_show",
		],
		["добровольный срок", { due_date: "2026-09-30" }, "Срок допустим"],
		[
			"добровольная просрочка",
			{ status: "overdue", completion_pct: 30, score: null },
			"Просрочка",
		],
		[
			"отказ от собственного назначения",
			{ status: "declined", completion_pct: 0, score: null },
			"Отказ",
		],
		[
			"будущее завершение",
			{ completed_at: "2026-10-02T12:00:00.000Z" },
			"Время завершения",
		],
		[
			"неправильное время",
			{ completed_at: "2026-09-20T99:00:00.000Z" },
			"Время завершения",
		],
	] as [string, Partial<History>, string][])(
		"проверяет %s",
		(_name, mutation, message) => {
			const copy: Dataset = structuredClone(jury);
			Object.assign(
				copy.history.find((record) => record.record_id === "JURY_ALPHA_001")!,
				mutation,
			);
			expect(() => validateDataset(copy)).toThrow(message);
		},
	);
});
