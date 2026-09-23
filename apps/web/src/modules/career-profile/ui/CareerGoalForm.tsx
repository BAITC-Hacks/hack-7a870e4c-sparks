"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useCatalog } from "@/modules/catalog";
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Spinner } from "@/shared/components/ui/spinner";
import { getApiErrorMessage } from "@/shared/lib/client/custom-instance";
import type { ProfileView } from "../model/mappers/profile.mapper";
import { useUpdateCareerGoal } from "../model/mutations/use-update-career-goal";

export function CareerGoalForm({ view }: { view: ProfileView }) {
  const t = useTranslations("careerProfile");
  const catalog = useCatalog();
  const updateGoal = useUpdateCareerGoal(view.employee.employee_id);
  const [targetRole, setTargetRole] = useState(view.target?.target_role ?? "");
  const [targetGrade, setTargetGrade] = useState(view.target?.target_grade ?? "");
  const roles = [...new Set((catalog.data?.roles ?? []).map((role) => role.role))];
  const grades = (catalog.data?.roles ?? []).filter((role) => role.role === targetRole);
  const selectedTarget = grades.find((role) => role.grade === targetGrade);
  const unchanged = view.targetSource === "explicit" && targetRole === view.target?.target_role && targetGrade === view.target?.target_grade;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTarget || unchanged || updateGoal.isPending) return;
    updateGoal.mutate({ goal: { target_role: selectedTarget.role, target_grade: selectedTarget.grade } }, { onSuccess: () => toast.success(t("goalUpdated")) });
  }

  return (
    <Card id="career-goal">
      <CardHeader><CardTitle><h2>{t("goalTitle")}</h2></CardTitle><CardDescription>{t("goalDescription")}</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-5" aria-busy={updateGoal.isPending}>
          <FieldGroup>
            <Field data-disabled={updateGoal.isPending || roles.length === 0}>
              <FieldLabel htmlFor="target-role">{t("role")}</FieldLabel>
              <Select value={targetRole} disabled={updateGoal.isPending || roles.length === 0} onValueChange={(role) => { setTargetRole(role); setTargetGrade(""); updateGoal.reset(); }}>
                <SelectTrigger id="target-role" className="w-full"><SelectValue placeholder={t("rolePlaceholder")} /></SelectTrigger>
                <SelectContent><SelectGroup>{roles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field data-disabled={updateGoal.isPending || !targetRole}>
              <FieldLabel htmlFor="target-grade">{t("grade")}</FieldLabel>
              <Select value={targetGrade} disabled={updateGoal.isPending || !targetRole} onValueChange={(grade) => { setTargetGrade(grade); updateGoal.reset(); }}>
                <SelectTrigger id="target-grade" className="w-full" aria-describedby="grade-hint"><SelectValue placeholder={t("gradePlaceholder")} /></SelectTrigger>
                <SelectContent><SelectGroup>{grades.map(({ grade }) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
              <FieldDescription id="grade-hint">{t(roles.length === 0 ? "noRoles" : "gradeHint")}</FieldDescription>
            </Field>
          </FieldGroup>
          {updateGoal.isError && <Alert variant="destructive"><AlertTitle>{t("saveError")}</AlertTitle><AlertDescription>{getApiErrorMessage(updateGoal.error)}</AlertDescription></Alert>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!selectedTarget || unchanged || updateGoal.isPending}>
              {updateGoal.isPending && <Spinner aria-hidden="true" data-icon="inline-start" />}
              {updateGoal.isPending ? t("saving") : t("saveGoal")}
            </Button>
            {view.employee.career_goal && <Button type="button" variant="outline" disabled={updateGoal.isPending} onClick={() => updateGoal.mutate({ goal: null }, { onSuccess: () => toast.success(t("goalReset")) })}>
              <RotateCcw aria-hidden="true" data-icon="inline-start" />{t("resetGoal")}
            </Button>}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{t("resetHint")}</p>
        </form>
      </CardContent>
    </Card>
  );
}
