export type Grade = "Junior" | "Middle" | "Senior" | "Lead";
export type Goal = { target_role: string; target_grade: Grade };
export type Employee = {
	employee_id: string;
	full_name: string;
	department: string;
	role: string;
	grade: Grade;
	manager_id: string | null;
	hire_date: string;
	tenure_months: number;
	work_format: "office" | "hybrid" | "remote";
	preferred_language: "ru" | "kk" | "en";
	career_goal: Goal | null;
	skills: Record<string, number>;
	last_review_date: string;
};
export type Skill = {
	skill_id: string;
	name: string;
	type: string;
	category: string;
	description: string;
};
export type RoleProfile = {
	role: string;
	grade: Grade;
	required_skills: Record<string, number>;
	critical_skills: string[];
};
export type Event = {
	event_id: string;
	title: string;
	description: string;
	type: string;
	format: "online" | "offline" | "self_paced";
	duration_hours: number;
	mandatory: boolean;
	target_roles: string[];
	target_grades: Grade[];
	develops_skills: { skill_id: string; gain: number; max_level: number }[];
	prerequisites: Record<string, number>;
	upcoming_sessions: string[];
};
export type History = {
	record_id: string;
	employee_id: string;
	event_id: string;
	date: string;
	due_date: string | null;
	status:
		| "completed"
		| "in_progress"
		| "dropped"
		| "no_show"
		| "declined"
		| "overdue";
	completion_pct: number;
	score: number | null;
	feedback_rating: number | null;
	assigned_by: "self" | "manager" | "hr";
	completed_at?: string | null;
};
export type Dataset = {
	as_of_date: string;
	employees: Employee[];
	events: Event[];
	skills: Skill[];
	role_profiles: RoleProfile[];
	history: History[];
};
export type SkillGap = {
	skill_id: string;
	name: string;
	current: number;
	required: number;
	gap: number;
	critical: boolean;
	covered: boolean;
};
export type Factor = {
	id: string;
	category: "grade" | "gap" | "history" | "target";
	text: string;
};
export type Candidate = {
	event: Event;
	score: number;
	factors: Factor[];
	next_session: string | null;
	gains: {
		skill_id: string;
		name: string;
		before: number;
		after: number;
		target: number;
	}[];
	in_progress: boolean;
};
export type Profile = {
	employee: Employee;
	effective_skills: Record<string, number>;
	target: Goal | null;
	target_source: "explicit" | "next_grade" | "none";
	readiness: number | null;
	gaps: SkillGap[];
	history: (History & { title: string; mandatory: boolean })[];
	warnings: string[];
};
export type Recommendation = Candidate & { explanation: string };
export type Recommendations = {
	mode: "ai" | "rules";
	model: string | null;
	message: string;
	recommendations: Recommendation[];
	generated_at: string;
	duration_ms: number;
};
export type SessionUser = {
	username: string;
	role: "employee" | "hr";
	employee_id: string | null;
	full_name: string;
};
export type HrOverview = {
	total_employees: number;
	employees_without_step: {
		employee_id: string;
		full_name: string;
		role: string;
		reason: string;
	}[];
	skill_gaps: {
		skill_id: string;
		name: string;
		employees: number;
		average_gap: number;
	}[];
	participation: {
		event_id: string;
		title: string;
		mandatory: boolean;
		completed: number;
		in_progress: number;
		other: number;
		total: number;
	}[];
	as_of_date: string;
};
