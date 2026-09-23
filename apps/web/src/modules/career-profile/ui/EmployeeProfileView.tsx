"use client";

import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useSession } from "@/modules/auth";
import { useCatalog } from "@/modules/catalog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
} from "@/shared/components/ui";
import { getApiErrorMessage } from "@/shared/lib/client/custom-instance";

import { mapProfileToView } from "../model/mappers/profile.mapper";
import { useUpdateCareerGoal } from "../model/mutations/use-update-career-goal";
import { useEmployeeProfile } from "../model/queries/use-employee-profile";

const grades = ["Junior", "Middle", "Senior", "Lead"] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function EmployeeProfileView({
  compact = false,
  nextStep,
}: {
  compact?: boolean;
  nextStep?: ReactNode;
}) {
  const t = useTranslations("careerProfile");
  const session = useSession();
  const employeeId = session.data?.employee_id ?? null;
  const profile = useEmployeeProfile(employeeId);
  const catalog = useCatalog();
  const updateGoal = useUpdateCareerGoal(employeeId ?? "");
  const [targetRole, setTargetRole] = useState("");
  const [targetGrade, setTargetGrade] =
    useState<(typeof grades)[number]>("Middle");

  const view = useMemo(
    () =>
      profile.data ? mapProfileToView(profile.data, catalog.data) : undefined,
    [catalog.data, profile.data],
  );

  if (profile.isPending || catalog.isPending) {
    return <ProfileSkeleton compact={compact} />;
  }

  if (profile.isError || catalog.isError) {
    const error = profile.error ?? catalog.error;
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{t("loadError")}</AlertTitle>
        <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  if (!view || !employeeId) {
    return (
      <Alert>
        <AlertTitle>{t("noEmployee")}</AlertTitle>
        <AlertDescription>{t("noEmployeeDescription")}</AlertDescription>
      </Alert>
    );
  }

  const roles = [
    ...new Set((catalog.data?.roles ?? []).map((role) => role.role)),
  ];
  const readiness = view.readiness;

  function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetRole) return;
    updateGoal.mutate(
      {
        goal: { target_role: targetRole, target_grade: targetGrade },
      },
      {
        onSuccess: () => {
          toast.success(t("goalUpdated"));
          setTargetRole("");
        },
      },
    );
  }

  function resetGoal() {
    updateGoal.mutate(
      { goal: null },
      { onSuccess: () => toast.success(t("goalReset")) },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{view.employee.full_name}</CardTitle>
              <CardDescription>
                {view.employee.role} · {view.employee.grade} ·{" "}
                {view.employee.department}
              </CardDescription>
            </div>
            <Badge variant="secondary">{view.employee.work_format}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("readiness")}</p>
              <p className="text-4xl font-semibold">
                {readiness === null ? "—" : `${Math.round(readiness)}%`}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{t("target")}</p>
              <p className="font-medium text-foreground">
                {view.target
                  ? `${view.target.target_role} · ${view.target.target_grade}`
                  : t("noTarget")}
              </p>
            </div>
          </div>
          <Progress value={readiness ?? 0} aria-label={t("readiness")} />
          <p className="text-sm text-muted-foreground">
            {view.targetSource === "next_grade"
              ? t("automaticTarget")
              : view.targetSource === "explicit"
                ? t("explicitTarget")
                : t("manualTargetNeeded")}
          </p>
        </CardContent>
      </Card>

      {view.warnings.length > 0 && (
        <Alert>
          <AlertCircle />
          <AlertTitle>{t("warnings")}</AlertTitle>
          <AlertDescription>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {view.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!compact && (
        <Card>
          <CardHeader>
            <CardTitle>{t("goalTitle")}</CardTitle>
            <CardDescription>{t("goalDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={submitGoal}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="target-role">{t("role")}</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger id="target-role">
                    <SelectValue placeholder={t("rolePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="target-grade">{t("grade")}</Label>
                <Select
                  value={targetGrade}
                  onValueChange={(value) =>
                    setTargetGrade(value as (typeof grades)[number])
                  }
                >
                  <SelectTrigger id="target-grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CardFooter className="px-0 pb-0">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={!targetRole || updateGoal.isPending}
                  >
                    {updateGoal.isPending ? t("saving") : t("saveGoal")}
                  </Button>
                  {view.target && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={updateGoal.isPending}
                      onClick={resetGoal}
                    >
                      <RotateCcw data-icon="inline-start" />
                      {t("resetGoal")}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </form>
            {updateGoal.isError && (
              <Alert className="mt-4" variant="destructive">
                <AlertTitle>{t("saveError")}</AlertTitle>
                <AlertDescription>
                  {getApiErrorMessage(updateGoal.error)}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {nextStep}

      <Card>
        <CardHeader>
          <CardTitle>{t("skillsTitle")}</CardTitle>
          <CardDescription>{t("skillsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {view.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noSkills")}</p>
          ) : (
            view.skills.slice(0, compact ? 4 : undefined).map((skill) => (
              <div key={skill.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{skill.name}</span>
                  <span className="text-muted-foreground">
                    {skill.current}
                    {skill.required === null ? "" : ` / ${skill.required}`}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, skill.current * 20)}
                  aria-label={skill.name}
                />
                {skill.gap !== null && skill.gap > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("gap", { value: skill.gap })}
                    {skill.critical ? ` · ${t("critical")}` : ""}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {
        <Card>
          <CardHeader>
            <CardTitle>{t("historyTitle")}</CardTitle>
            <CardDescription>{t("historyDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {view.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
            ) : (
              view.history
                .slice(0, compact ? 3 : undefined)
                .map((item, index) => (
                  <div key={item.record_id}>
                    {index > 0 && <Separator className="mb-3" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 text-accent" />
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(item.date)} · {item.status}
                            {item.mandatory ? ` · ${t("mandatory")}` : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{item.completion_pct}%</Badge>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      }
    </div>
  );
}

function ProfileSkeleton({ compact }: { compact: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {["one", "two", "three", "four", "five"]
            .slice(0, compact ? 3 : 5)
            .map((slot) => (
              <Skeleton key={slot} className="h-10 w-full" />
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
