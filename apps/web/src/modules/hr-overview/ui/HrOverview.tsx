"use client";

import { useTranslations } from "next-intl";

import { useSession, useSessionExpiry } from "@/modules/auth";
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
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Link } from "@/shared/configs/i18/navigation";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";

import type { HrOverviewData } from "../api/hr-overview.api";
import { useHrOverview } from "../model/queries/use-hr-overview";

function OverviewLoading() {
  const t = useTranslations("hrOverview");
  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="flex flex-col gap-6"
    >
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
      <Skeleton className="h-24 w-full motion-reduce:animate-none" />
      <Skeleton className="h-64 w-full motion-reduce:animate-none" />
    </div>
  );
}

function OverviewEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function Participation({
  events,
}: {
  events: HrOverviewData["participation"];
}) {
  const t = useTranslations("hrOverview");
  if (events.length === 0) {
    return (
      <OverviewEmpty
        title={t("noParticipation")}
        description={t("noParticipationDescription")}
      />
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table aria-label={t("participationTitle")}>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("activity")}</TableHead>
              <TableHead scope="col">{t("completed")}</TableHead>
              <TableHead scope="col">{t("inProgress")}</TableHead>
              <TableHead scope="col">{t("other")}</TableHead>
              <TableHead scope="col">{t("total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.event_id}>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-col items-start gap-2 py-2">
                    <span className="font-medium">{event.title}</span>
                    <Badge variant={event.mandatory ? "secondary" : "outline"}>
                      {t(event.mandatory ? "mandatory" : "voluntary")}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{event.completed}</TableCell>
                <TableCell>{event.in_progress}</TableCell>
                <TableCell>{event.other}</TableCell>
                <TableCell>{event.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-6 md:hidden">
        {events.map((event) => (
          <li key={event.event_id} className="flex flex-col gap-3">
            <h3 className="font-medium">{event.title}</h3>
            <Badge
              variant={event.mandatory ? "secondary" : "outline"}
              className="w-fit"
            >
              {t(event.mandatory ? "mandatory" : "voluntary")}
            </Badge>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("completed")}</dt>
                <dd>{event.completed}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("inProgress")}</dt>
                <dd>{event.in_progress}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("other")}</dt>
                <dd>{event.other}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("total")}</dt>
                <dd>{event.total}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function HrOverview() {
  const t = useTranslations("hrOverview");
  const session = useSession();
  const isHr = session.data?.role === "hr";
  const query = useHrOverview(isHr);
  useSessionExpiry(query.error);

  if (session.isPending) return <OverviewLoading />;

  if (!isHr || getApiErrorStatus(query.error) === 403) {
    return (
      <Alert>
        <AlertTitle>{t("forbidden")}</AlertTitle>
        <AlertDescription>{t("forbiddenDescription")}</AlertDescription>
      </Alert>
    );
  }

  if (query.isPending) return <OverviewLoading />;

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("error")}</AlertTitle>
        <AlertDescription>
          <p>{getApiErrorMessage(query.error, t("error"))}</p>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching && (
              <Spinner aria-hidden="true" data-icon="inline-start" />
            )}
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const data = query.data;
  const largestSkillCount = Math.max(
    1,
    ...data.skill_gaps.map((gap) => gap.employees),
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("asOf", { date: data.as_of_date })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link
              href={{
                pathname: "/hr/employees",
                query: { withoutStep: "true" },
              }}
            >
              {t("viewWithoutStep")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/hr/employees">{t("viewEmployees")}</Link>
          </Button>
        </div>
      </div>

      <dl className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <dt className="text-sm text-muted-foreground">
            {t("totalEmployees")}
          </dt>
          <dd className="text-4xl font-semibold tabular-nums">
            {data.total_employees}
          </dd>
        </div>
        <div className="flex flex-col gap-2">
          <dt className="text-sm text-muted-foreground">
            {t("withoutStepCount")}
          </dt>
          <dd className="text-4xl font-semibold tabular-nums">
            {data.employees_without_step.length}
          </dd>
        </div>
      </dl>

      {data.total_employees === 0 && (
        <OverviewEmpty
          title={t("noEmployees")}
          description={t("noEmployeesDescription")}
        />
      )}

      <section
        aria-labelledby="hr-skill-gaps-title"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <h2 id="hr-skill-gaps-title" className="text-xl font-semibold">
            {t("skillGapsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("skillGapsDescription")}
          </p>
        </div>
        {data.skill_gaps.length === 0 ? (
          <OverviewEmpty
            title={t("noSkillGaps")}
            description={t("noSkillGapsDescription")}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table aria-label={t("skillGapsTitle")}>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t("skill")}</TableHead>
                    <TableHead scope="col">{t("affectedEmployees")}</TableHead>
                    <TableHead scope="col">{t("averageGap")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.skill_gaps.map((gap) => (
                    <TableRow key={gap.skill_id}>
                      <TableCell className="w-1/2 whitespace-normal">
                        <div className="flex flex-col gap-2 py-2">
                          <span className="font-medium">{gap.name}</span>
                          <div
                            aria-hidden="true"
                            className="h-1.5 overflow-hidden rounded-full bg-muted"
                          >
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${(gap.employees / largestSkillCount) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{gap.employees}</TableCell>
                      <TableCell>{gap.average_gap}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="flex flex-col gap-6 md:hidden">
              {data.skill_gaps.map((gap) => (
                <li key={gap.skill_id} className="flex flex-col gap-3">
                  <h3 className="font-medium">{gap.name}</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">
                        {t("affectedEmployees")}
                      </dt>
                      <dd>{gap.employees}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t("averageGap")}
                      </dt>
                      <dd>{gap.average_gap}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section
        aria-labelledby="hr-participation-title"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <h2 id="hr-participation-title" className="text-xl font-semibold">
            {t("participationTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("participationDescription")}
          </p>
        </div>
        <Participation events={data.participation} />
      </section>

      <section
        aria-labelledby="hr-without-step-title"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <h2 id="hr-without-step-title" className="text-xl font-semibold">
            {t("withoutStepTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("withoutStepDescription")}
          </p>
        </div>
        {data.employees_without_step.length === 0 ? (
          <OverviewEmpty
            title={t("noEmployeesWithoutStep")}
            description={t("noEmployeesWithoutStepDescription")}
          />
        ) : (
          <ul className="flex flex-col gap-5">
            {data.employees_without_step.map((employee) => (
              <li key={employee.employee_id} className="flex flex-col gap-2">
                <Link
                  className="w-fit font-medium underline underline-offset-4"
                  href={{
                    pathname: "/hr/employees",
                    query: { employee: employee.employee_id },
                  }}
                >
                  {employee.full_name}
                </Link>
                <p className="text-sm text-muted-foreground">{employee.role}</p>
                <p className="text-sm">{employee.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
