import type { ProfileData } from "@/modules/career-profile";

import type { ActivityCompletionResponse } from "../../api/activities.api";

export type ActivityCompletion = ActivityCompletionResponse & {
  before: ProfileData | undefined;
};

type ChangedSkill = { id: string; name: string; before: number; after: number };

function skillLevel(
  skills: Record<string, unknown>,
  id: string,
): number | null {
  if (!Object.hasOwn(skills, id)) return 0;
  const value = skills[id];
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 5
    ? value
    : null;
}

export function mapCompletionToView(
  completion: ActivityCompletion,
  asOfDate: string,
) {
  const { profile, before, already_completed: alreadyCompleted } = completion;
  const previous =
    before?.employee.employee_id === profile.employee.employee_id
      ? before
      : undefined;
  const names = new Map(
    [...(previous?.gaps ?? []), ...profile.gaps].map((gap) => [
      gap.skill_id,
      gap.name,
    ]),
  );
  const changedSkills: ChangedSkill[] = [];

  if (previous && !alreadyCompleted) {
    const skillIds = new Set([
      ...Object.keys(previous.effective_skills),
      ...Object.keys(profile.effective_skills),
    ]);
    for (const id of skillIds) {
      const previousLevel = skillLevel(previous.effective_skills, id);
      const nextLevel = skillLevel(profile.effective_skills, id);
      if (
        previousLevel !== null &&
        nextLevel !== null &&
        previousLevel !== nextLevel
      ) {
        changedSkills.push({
          id,
          name: names.get(id) ?? id,
          before: previousLevel,
          after: nextLevel,
        });
      }
    }
  }

  const sameTarget =
    previous?.target &&
    profile.target &&
    previous.target.target_role === profile.target.target_role &&
    previous.target.target_grade === profile.target.target_grade;
  const closedGaps =
    previous && sameTarget && !alreadyCompleted
      ? previous.gaps
          .filter((gap) => {
            const nextLevel = skillLevel(
              profile.effective_skills,
              gap.skill_id,
            );
            return (
              gap.gap > 0 &&
              Number.isFinite(gap.required) &&
              nextLevel !== null &&
              nextLevel >= gap.required &&
              !profile.gaps.some(
                (nextGap) =>
                  nextGap.skill_id === gap.skill_id && nextGap.gap > 0,
              )
            );
          })
          .map((gap) => ({ id: gap.skill_id, name: gap.name }))
      : [];

  return {
    alreadyCompleted,
    comparisonAvailable: Boolean(previous),
    readinessBefore: previous?.readiness ?? null,
    readinessAfter: profile.readiness,
    changedSkills,
    closedGaps,
    asOfDate,
  };
}
