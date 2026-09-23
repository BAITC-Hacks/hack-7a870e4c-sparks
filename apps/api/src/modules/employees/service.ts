import type {
	Candidate,
	Dataset,
	Employee,
	Event,
	Goal,
	Grade,
	History,
	HrOverview,
	Profile,
} from "../../contracts";

const grades: Grade[] = ["Junior", "Middle", "Senior", "Lead"];

function employeeFor(dataset: Dataset, employeeId: string): Employee {
	const employee = dataset.employees.find(
		(item) => item.employee_id === employeeId,
	);
	if (!employee) throw new Error("Сотрудник не найден.");
	return employee;
}

function completionKey(record: History): string {
	return record.completed_at || `${record.date}T00:00:00.000Z`;
}

function historyFor(dataset: Dataset, employeeId: string): History[] {
	return dataset.history.filter(
		(item) =>
			item.employee_id === employeeId && item.date <= dataset.as_of_date,
	);
}

/** The cap belongs to the event: it must never reduce a previously acquired level. */
function levelAfter(current: number, gain: number, cap: number): number {
	return Math.max(current, Math.min(current + gain, cap, 5));
}

function targetFor(employee: Employee): {
	target: Goal | null;
	source: Profile["target_source"];
} {
	if (employee.career_goal)
		return { target: { ...employee.career_goal }, source: "explicit" };
	const nextGrade = grades[grades.indexOf(employee.grade) + 1];
	return nextGrade
		? {
				target: { target_role: employee.role, target_grade: nextGrade },
				source: "next_grade",
			}
		: { target: null, source: "none" };
}

export function profileFor(dataset: Dataset, employeeId: string): Profile {
	const employee = employeeFor(dataset, employeeId);
	const events = new Map(
		dataset.events.map((event) => [event.event_id, event]),
	);
	const skillNames = new Map(
		dataset.skills.map((skill) => [skill.skill_id, skill.name]),
	);
	const records = historyFor(dataset, employeeId);
	const effective: Record<string, number> = { ...employee.skills };
	const warnings: string[] = [];
	const counted = new Set<string>();
	for (const record of [...records].sort(
		(a, b) =>
			completionKey(a).localeCompare(completionKey(b)) ||
			a.record_id.localeCompare(b.record_id),
	)) {
		if (record.status !== "completed") continue;
		const event = events.get(record.event_id);
		if (!event) continue;
		const completionDay = record.completed_at?.slice(0, 10);
		if (
			!completionDay ||
			completionDay <= employee.last_review_date ||
			completionDay > dataset.as_of_date
		)
			continue;
		// Match the agent: a completed nonrepeatable activity adds its gain once.
		const completionId = JSON.stringify(
			record.event_id === "EV_036"
				? [record.event_id, record.record_id]
				: [record.event_id],
		);
		if (counted.has(completionId)) continue;
		counted.add(completionId);
		for (const skill of event.develops_skills) {
			effective[skill.skill_id] = levelAfter(
				effective[skill.skill_id] ?? 0,
				skill.gain,
				skill.max_level,
			);
		}
	}
	if (
		records.some(
			(record) => record.status === "completed" && !record.completed_at,
		)
	) {
		warnings.push(
			"У завершённых активностей без completed_at прирост после оценки не восстанавливается; он может быть недоучтён. Дата участия не считается датой завершения.",
		);
	}
	const { target, source } = targetFor(employee);
	const requirements =
		target &&
		dataset.role_profiles.find(
			(item) =>
				item.role === target.target_role && item.grade === target.target_grade,
		);
	let readiness: number | null = null;
	const gaps: Profile["gaps"] = [];
	if (requirements) {
		let total = 0;
		let covered = 0;
		for (const [skillId, required] of Object.entries(
			requirements.required_skills,
		)) {
			const current = effective[skillId] ?? 0;
			total += required;
			covered += Math.min(current, required);
			if (current >= required) continue;
			const catalogCaps = dataset.events
				.filter((event) => !event.mandatory)
				.flatMap((event) => event.develops_skills)
				.filter((skill) => skill.skill_id === skillId && skill.gain > 0)
				.map((skill) => skill.max_level);
			const maxCap = Math.max(0, ...catalogCaps);
			const name = skillNames.get(skillId) ?? skillId;
			gaps.push({
				skill_id: skillId,
				name,
				current,
				required,
				gap: required - current,
				critical: requirements.critical_skills.includes(skillId),
				covered: maxCap > current,
			});
			if (maxCap <= current) {
				warnings.push(
					`Каталог не содержит добровольного мероприятия, способного повысить навык «${name}» с текущего уровня ${current}.`,
				);
			} else if (maxCap < required) {
				warnings.push(
					`Каталог развивает навык «${name}» максимум до ${maxCap}; для цели требуется ${required}.`,
				);
			}
		}
		readiness = total === 0 ? 100 : Math.round((covered / total) * 1_000) / 10;
	} else if (!target) {
		warnings.push(
			"У Lead нет следующего грейда в каталоге. Задайте явную карьерную цель.",
		);
	} else {
		warnings.push("В каталоге нет профиля требований для выбранной цели.");
	}
	gaps.sort(
		(a, b) =>
			Number(b.critical) - Number(a.critical) ||
			b.gap - a.gap ||
			a.skill_id.localeCompare(b.skill_id),
	);
	return {
		employee,
		effective_skills: effective,
		target,
		target_source: source,
		readiness,
		gaps,
		history: [...records]
			.sort(
				(a, b) =>
					b.date.localeCompare(a.date) ||
					a.record_id.localeCompare(b.record_id),
			)
			.map((record) => ({
				...record,
				title: events.get(record.event_id)?.title ?? record.event_id,
				mandatory: events.get(record.event_id)?.mandatory ?? false,
			})),
		warnings,
	};
}

/** Exposed for completion validation; audience is based on the employee's actual role. */
export function eventBlockedReasons(
	dataset: Dataset,
	profile: Profile,
	event: Event,
): string[] {
	const reasons: string[] = [];
	if (event.mandatory) reasons.push("обязательное мероприятие");
	if (
		!event.target_roles.includes(profile.employee.role) ||
		!event.target_grades.includes(profile.employee.grade)
	) {
		reasons.push("мероприятие не соответствует текущей роли или грейду");
	}
	const records = historyFor(dataset, profile.employee.employee_id).filter(
		(item) => item.event_id === event.event_id,
	);
	if (
		records.some(
			(item) =>
				item.status === "completed" &&
				(event.event_id !== "EV_036" ||
					(item.completed_at?.slice(0, 10) ?? item.date) ===
						dataset.as_of_date),
		)
	) {
		reasons.push("мероприятие уже завершено");
	}
	if (
		Object.entries(event.prerequisites).some(
			([id, required]) => (profile.effective_skills[id] ?? 0) < required,
		)
	) {
		reasons.push("не выполнены требования к начальным навыкам");
	}
	if (
		event.format !== "self_paced" &&
		!event.upcoming_sessions.some((date) => date >= dataset.as_of_date)
	) {
		reasons.push("нет доступной сессии");
	}
	return reasons;
}

function candidatesForProfile(dataset: Dataset, profile: Profile): Candidate[] {
	if (!profile.target || profile.gaps.length === 0) return [];
	const required = dataset.role_profiles.find(
		(item) =>
			item.role === profile.target!.target_role &&
			item.grade === profile.target!.target_grade,
	);
	if (!required) return [];
	const skillNames = new Map(
		dataset.skills.map((skill) => [skill.skill_id, skill.name]),
	);
	const candidates: Candidate[] = [];
	for (const event of dataset.events) {
		if (eventBlockedReasons(dataset, profile, event).length) continue;
		const gains = event.develops_skills
			.map((skill) => {
				const before = profile.effective_skills[skill.skill_id] ?? 0;
				return {
					skill_id: skill.skill_id,
					name: skillNames.get(skill.skill_id) ?? skill.skill_id,
					before,
					after: levelAfter(before, skill.gain, skill.max_level),
					target: required.required_skills[skill.skill_id] ?? 0,
				};
			})
			.filter((gain) => gain.after > gain.before);
		const useful = gains.filter((gain) => gain.target > gain.before);
		if (!useful.length) continue;
		const score = useful.reduce(
			(sum, gain) =>
				sum +
				(Math.min(gain.after, gain.target) - gain.before) *
					(required.critical_skills.includes(gain.skill_id) ? 2 : 1),
			0,
		);
		const previous = profile.history.filter(
			(item) => item.event_id === event.event_id,
		);
		const inProgress = previous.some((item) => item.status === "in_progress");
		const latest = previous[0];
		const statuses: Record<History["status"], string> = {
			completed: "завершено",
			in_progress: "начато",
			dropped: "прекращено",
			no_show: "пропущено",
			declined: "отклонено",
			overdue: "просрочено",
		};
		const historyText = inProgress
			? "У вас уже есть начатое участие в этом мероприятии; можно продолжить обучение."
			: latest
				? `Последнее участие ${latest.date}: ${statuses[latest.status]}. Эта история учтена при выборе шага.`
				: "В истории нет участия в этом мероприятии; это новый шаг развития.";
		candidates.push({
			event,
			score,
			gains,
			in_progress: inProgress,
			next_session:
				event.format === "self_paced"
					? null
					: ([...event.upcoming_sessions]
							.filter((date) => date >= dataset.as_of_date)
							.sort()[0] ?? null),
			factors: [
				{
					id: `${event.event_id}:grade`,
					category: "grade",
					text: `Мероприятие доступно для вашей текущей роли ${profile.employee.role} и грейда ${profile.employee.grade}.`,
				},
				{
					id: `${event.event_id}:gap`,
					category: "gap",
					text: `Сокращает разрывы: ${useful.map((gain) => `${gain.name} ${gain.before} → ${gain.after} (требуется ${gain.target})`).join("; ")}.`,
				},
				{
					id: `${event.event_id}:history`,
					category: "history",
					text: historyText,
				},
				{
					id: `${event.event_id}:target`,
					category: "target",
					text: `Поддерживает цель ${profile.target.target_role}, ${profile.target.target_grade}; ${useful.some((gain) => required.critical_skills.includes(gain.skill_id)) ? "развивает в том числе критический навык" : "развивает требуемые навыки"}.`,
				},
			],
		});
	}
	return candidates.sort(
		(a, b) =>
			b.score - a.score ||
			Number(b.in_progress) - Number(a.in_progress) ||
			a.event.duration_hours - b.event.duration_hours ||
			a.event.event_id.localeCompare(b.event.event_id),
	);
}

export function candidatesFor(
	dataset: Dataset,
	employeeId: string,
): Candidate[] {
	return candidatesForProfile(dataset, profileFor(dataset, employeeId));
}

export function noStepReason(dataset: Dataset, profile: Profile): string {
	if (!profile.target)
		return "Карьерная цель не задана; у текущего грейда нет следующей ступени.";
	if (profile.readiness === null)
		return "В каталоге нет профиля требований для выбранной цели.";
	if (profile.gaps.length === 0)
		return "Требования выбранной цели уже покрыты; это не означает автоматическое повышение.";
	const usefulEvents = dataset.events.filter(
		(event) =>
			!event.mandatory &&
			event.develops_skills.some((skill) =>
				profile.gaps.some(
					(gap) =>
						gap.skill_id === skill.skill_id &&
						skill.gain > 0 &&
						skill.max_level > gap.current,
				),
			),
	);
	if (!usefulEvents.length)
		return "Каталог не развивает оставшиеся дефицитные навыки до нужного уровня.";
	const blocked = [
		...new Set(
			usefulEvents.flatMap((event) =>
				eventBlockedReasons(dataset, profile, event),
			),
		),
	];
	return `Нет допустимого следующего шага: ${blocked.join("; ") || "нет мероприятия, сокращающего оставшиеся разрывы"}.`;
}

export function hrOverview(dataset: Dataset): HrOverview {
	const deficits = new Map<
		string,
		{ name: string; employees: number; total: number }
	>();
	const employeesWithoutStep: HrOverview["employees_without_step"] = [];
	for (const employee of dataset.employees) {
		const profile = profileFor(dataset, employee.employee_id);
		for (const gap of profile.gaps) {
			const aggregate = deficits.get(gap.skill_id) ?? {
				name: gap.name,
				employees: 0,
				total: 0,
			};
			aggregate.employees += 1;
			aggregate.total += gap.gap;
			deficits.set(gap.skill_id, aggregate);
		}
		if (candidatesForProfile(dataset, profile).length === 0) {
			employeesWithoutStep.push({
				employee_id: employee.employee_id,
				full_name: employee.full_name,
				role: employee.role,
				reason: noStepReason(dataset, profile),
			});
		}
	}
	return {
		as_of_date: dataset.as_of_date,
		total_employees: dataset.employees.length,
		employees_without_step: employeesWithoutStep,
		skill_gaps: [...deficits]
			.map(([id, gap]) => ({
				skill_id: id,
				name: gap.name,
				employees: gap.employees,
				average_gap: Math.round((gap.total / gap.employees) * 100) / 100,
			}))
			.sort(
				(a, b) =>
					b.employees - a.employees ||
					b.average_gap - a.average_gap ||
					a.skill_id.localeCompare(b.skill_id),
			),
		participation: dataset.events.map((event) => {
			const records = dataset.history.filter(
				(item) =>
					item.event_id === event.event_id && item.date <= dataset.as_of_date,
			);
			const completed = records.filter(
				(item) => item.status === "completed",
			).length;
			const inProgress = records.filter(
				(item) => item.status === "in_progress",
			).length;
			return {
				event_id: event.event_id,
				title: event.title,
				mandatory: event.mandatory,
				completed,
				in_progress: inProgress,
				other: records.length - completed - inProgress,
				total: records.length,
			};
		}),
	};
}

import type { Store } from "../../utils/db";
import { HttpError, mutation } from "../../utils/http";

export class EmployeesService {
	constructor(private store: Store) {}
	async list() {
		const data = await this.store.readDataset();
		return {
			employees: data.employees.map(
				({ employee_id, full_name, role, grade, department }) => ({
					employee_id,
					full_name,
					role,
					grade,
					department,
				}),
			),
		};
	}
	async profile(id: string) {
		const data = await this.store.readDataset();
		if (!data.employees.some((employee) => employee.employee_id === id))
			throw new HttpError(404, "Сотрудник не найден.");
		return profileFor(data, id);
	}
	async updateGoal(id: string, goal: Goal | null) {
		await this.profile(id);
		return mutation(() => this.store.updateGoal(id, goal));
	}
	async complete(id: string, eventId: string) {
		const data = await this.store.readDataset();
		if (!data.employees.some((employee) => employee.employee_id === id))
			throw new HttpError(404, "Сотрудник не найден.");
		if (!data.events.some((event) => event.event_id === eventId))
			throw new HttpError(404, "Мероприятие не найдено.");
		return mutation(() => this.store.completeActivity(id, eventId));
	}
}
