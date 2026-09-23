"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useSession, useSessionExpiry } from "@/modules/auth";
import { useCatalog } from "@/modules/catalog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { Progress } from "@/shared/components/ui/progress";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";

import { mapProfileToView } from "../model/mappers/profile.mapper";
import { useEmployeeProfile } from "../model/queries/use-employee-profile";

export function HrEmployeeProfile({ employeeId }: { employeeId: string }) {
  const t = useTranslations("hrProfile");
  const session = useSession();
  useSessionExpiry(session.error);

  if (session.isPending) return <HrProfileLoading />;
  if (session.isError)
    return (
      <HrProfileError
        error={session.error}
        pending={session.isFetching}
        onRetry={() => void session.refetch()}
      />
    );
  if (session.data?.role !== "hr")
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>{t("forbidden")}</AlertTitle>
        <AlertDescription>{t("forbiddenDescription")}</AlertDescription>
      </Alert>
    );
  if (!employeeId)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("noSelection")}</EmptyTitle>
          <EmptyDescription>{t("noSelectionDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  // Queries mount only for HR. A new selection cannot retain the previous view.
  return <HrProfileContent key={employeeId} employeeId={employeeId} />;
}

function HrProfileContent({ employeeId }: { employeeId: string }) {
  const t = useTranslations("hrProfile");
  const locale = useLocale();
  const profile = useEmployeeProfile(employeeId, { refetchOnMount: true });
  const catalog = useCatalog();
  useSessionExpiry(
    [profile.error, catalog.error].find(
      (error) => getApiErrorStatus(error) === 401,
    ),
  );

  if (profile.isPending || catalog.isPending) return <HrProfileLoading />;
  if (profile.isError || catalog.isError)
    return (
      <HrProfileError
        error={profile.error ?? catalog.error}
        missingEmployee={getApiErrorStatus(profile.error) === 404}
        pending={profile.isFetching || catalog.isFetching}
        onRetry={() => {
          void profile.refetch();
          void catalog.refetch();
        }}
      />
    );
  if (profile.data.employee.employee_id !== employeeId)
    return <HrProfileError error={new Error(t("wrongProfile"))} />;

  const view = mapProfileToView(profile.data, catalog.data);
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(date);
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold break-words">
          {view.employee.full_name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {view.employee.role} · {view.employee.grade}
        </p>
        <p className="text-sm">{view.employee.department}</p>
        <p className="text-xs text-muted-foreground">
          {t("asOf", { date: formatDate(catalog.data.as_of_date) })}
        </p>
      </header>

      <section aria-label={t("target")} className="flex flex-col gap-3">
        <h3 className="font-medium">{t("target")}</h3>
        <p className="text-sm">
          {view.target
            ? `${view.target.target_role} · ${view.target.target_grade}`
            : t("noTarget")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(`targetSource.${view.targetSource}`)}
        </p>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span>{t("readiness")}</span>
          <span className="font-semibold tabular-nums">
            {view.readiness === null ? "—" : `${view.readiness}%`}
          </span>
        </div>
        {view.readiness !== null && (
          <Progress value={view.readiness} aria-label={t("readiness")} />
        )}
        <p className="text-sm text-muted-foreground">{t("readinessNote")}</p>
      </section>

      {view.warnings.length > 0 && (
        <Alert>
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{t("warnings")}</AlertTitle>
          <AlertDescription>
            <ul className="flex list-disc flex-col gap-2 pl-4">
              {view.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Separator />
      <section aria-label={t("skills")} className="flex flex-col gap-4">
        <h3 className="font-medium">{t("skills")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("skillsDescription")}
        </p>
        {view.skills.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("noSkills")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {view.skills.map((skill) => (
              <li key={skill.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
                  <span className="font-medium">{skill.name}</span>
                  <span className="tabular-nums">
                    {t("skillLevels", {
                      current: skill.current,
                      required: skill.required === null ? "—" : skill.required,
                    })}
                  </span>
                </div>
                {skill.gap !== null && skill.gap > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {t("gap", { value: skill.gap })}
                    </span>
                    {skill.critical && (
                      <Badge variant="secondary">{t("critical")}</Badge>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />
      <section aria-label={t("history")} className="flex flex-col gap-4">
        <h3 className="font-medium">{t("history")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("historyDescription")}
        </p>
        {view.history.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("noHistory")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-5">
            {view.history.map((item) => (
              <li key={item.record_id} className="flex flex-col gap-2 text-sm">
                <p className="font-medium">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{t(`status.${item.status}`)}</Badge>
                  <Badge variant="secondary">
                    {t(item.mandatory ? "mandatory" : "voluntary")}
                  </Badge>
                  <span className="tabular-nums">{item.completion_pct}%</span>
                </div>
                <p className="text-muted-foreground">
                  {t("recordDate", { date: formatDate(item.date) })}
                </p>
                {item.completed_at && (
                  <p className="text-muted-foreground">
                    {t("completedAt", { date: formatDate(item.completed_at) })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HrProfileLoading() {
  const t = useTranslations("hrProfile");
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("loading")}
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function HrProfileError({
  error,
  pending = false,
  onRetry,
  missingEmployee = false,
}: {
  error: unknown;
  pending?: boolean;
  onRetry?: () => void;
  missingEmployee?: boolean;
}) {
  const t = useTranslations("hrProfile");
  const status = getApiErrorStatus(error);
  if (status === 404 && missingEmployee)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("notFound")}</EmptyTitle>
          <EmptyDescription>{t("notFoundDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  if (status === 401) return <HrProfileLoading />;
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{t(status === 403 ? "forbidden" : "loadError")}</AlertTitle>
      <AlertDescription>
        <p>
          {status === 403
            ? t("forbiddenDescription")
            : getApiErrorMessage(error)}
        </p>
        {status !== 403 && onRetry && (
          <Button variant="outline" disabled={pending} onClick={onRetry}>
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            {t("retry")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
