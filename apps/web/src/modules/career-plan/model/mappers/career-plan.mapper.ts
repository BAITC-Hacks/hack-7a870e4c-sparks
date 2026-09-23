import type {
  CareerPlanCatalogDto,
  CareerPlanDto,
} from "../../api/career-plan.api";

function skillLevel(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 5
    ? value
    : null;
}

export function mapCareerPlan(
  plan: CareerPlanDto,
  catalog?: CareerPlanCatalogDto,
) {
  const names = new Map(
    (catalog?.skills ?? []).map((skill) => [skill.skill_id, skill.name]),
  );
  for (const gap of plan.gaps) names.set(gap.skill_id, gap.name);
  for (const recommendation of plan.recommendations) {
    for (const gain of recommendation.gains)
      names.set(gain.skill_id, gain.name);
  }
  const requirements =
    catalog?.roles.find(
      (role) =>
        role.role === plan.career_goal?.target_role &&
        role.grade === plan.career_goal.target_grade,
    )?.required_skills ?? {};
  const ids = new Set([
    ...Object.keys(plan.effective_skills),
    ...Object.keys(plan.projected_skills),
    ...Object.keys(requirements),
    ...plan.gaps.map((gap) => gap.skill_id),
    ...plan.uncovered_skills,
  ]);
  const skills = [...ids].map((id) => {
    const gap = plan.gaps.find((item) => item.skill_id === id);
    return {
      id,
      name: names.get(id) ?? id,
      // Missing current skills are zero; malformed values remain unknown.
      current: Object.hasOwn(plan.effective_skills, id)
        ? skillLevel(plan.effective_skills[id])
        : 0,
      projected: skillLevel(plan.projected_skills[id]),
      required: skillLevel(gap?.required ?? requirements[id]),
      gap: gap?.gap ?? null,
      critical: gap?.critical ?? false,
    };
  });
  const mandatoryIds = new Set([
    ...plan.mandatory_tasks.map((task) => task.event_id),
    ...plan.recommendations
      .filter((item) => item.event.mandatory)
      .map((item) => item.event.event_id),
  ]);
  const recommendations = plan.recommendations
    .filter((item) => !mandatoryIds.has(item.event.event_id))
    .slice(0, 3);
  const eventNames = new Map(
    recommendations.map((item) => [item.event.event_id, item.event.title]),
  );

  return {
    ...plan,
    skills,
    invalidSkillData: [
      plan.effective_skills,
      plan.projected_skills,
      requirements,
    ].some((levels) =>
      Object.values(levels).some((value) => skillLevel(value) === null),
    ),
    recommendations,
    trajectory: plan.trajectory
      .filter((step) => !mandatoryIds.has(step.event_id))
      .slice(0, 3)
      .map((step) => ({
        ...step,
        title: eventNames.get(step.event_id) ?? step.event_id,
      })),
    uncoveredSkills: plan.uncovered_skills.map((id) => ({
      id,
      name: names.get(id) ?? id,
    })),
  };
}

export type CareerPlanViewModel = ReturnType<typeof mapCareerPlan>;
