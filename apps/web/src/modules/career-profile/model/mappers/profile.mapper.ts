import type {
  GetCatalogResult,
  GetProfileResult,
} from "@/shared/api/generated";

export type SkillView = {
  id: string;
  name: string;
  current: number;
  required: number | null;
  gap: number | null;
  critical: boolean;
};

export type ProfileView = {
  employee: GetProfileResult["employee"];
  target: GetProfileResult["target"];
  targetSource: GetProfileResult["target_source"];
  readiness: number | null;
  gaps: GetProfileResult["gaps"];
  history: GetProfileResult["history"];
  warnings: string[];
  skills: SkillView[];
};

function asLevel(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapProfileToView(
  profile: GetProfileResult,
  catalog: GetCatalogResult | undefined,
): ProfileView {
  const catalogSkills = new Map(
    (catalog?.skills ?? []).map((skill) => [skill.skill_id, skill.name]),
  );
  const targetRequirements = profile.target
    ? catalog?.roles.find(
        (role) =>
          role.role === profile.target?.target_role &&
          role.grade === profile.target?.target_grade,
      )?.required_skills
    : undefined;
  const skillIds = new Set([
    ...Object.keys(profile.effective_skills),
    ...Object.keys(targetRequirements ?? {}),
  ]);

  const skills = [...skillIds]
    .map((id) => {
      const gap = profile.gaps.find((item) => item.skill_id === id);
      return {
        id,
        name: catalogSkills.get(id) ?? id,
        current: asLevel(profile.effective_skills[id]) ?? 0,
        required: targetRequirements ? asLevel(targetRequirements[id]) : null,
        gap: gap?.gap ?? null,
        critical: gap?.critical ?? false,
      };
    })
    .sort((left, right) => (right.gap ?? 0) - (left.gap ?? 0));

  return {
    employee: profile.employee,
    target: profile.target,
    targetSource: profile.target_source,
    readiness: profile.readiness,
    gaps: profile.gaps,
    history: profile.history,
    warnings: profile.warnings,
    skills,
  };
}
