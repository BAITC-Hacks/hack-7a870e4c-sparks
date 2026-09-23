"use client";

import { AlertCircle, ArrowRight, LockKeyhole, RefreshCw } from "lucide-react";
import { useLocale } from "next-intl";

import { useSession } from "@/modules/auth";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { Spinner } from "@/shared/components/ui/spinner";
import { Link } from "@/shared/configs/i18/navigation";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";

import type { HrOverviewData } from "../api/hr-overview.api";
import {
  type HrOverviewMessages,
  hrOverviewMessages,
} from "../model/hr-overview.messages";
import { useHrOverview } from "../model/queries/use-hr-overview";

export function HrOverview() {
  const locale = useLocale();
  const messages = hrOverviewMessages[locale === "kk" ? "kk" : "ru"];
  const number = new Intl.NumberFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
    maximumFractionDigits: 2,
  });
  const session = useSession();
  const overview = useHrOverview();
  const status = getApiErrorStatus(overview.error);

  if (
    (!session.isPending && session.data?.role !== "hr") ||
    status === 401 ||
    status === 403
  ) {
    return (
      <Alert>
        <LockKeyhole aria-hidden="true" />
        <AlertTitle>{messages.forbidden}</AlertTitle>
        <AlertDescription>{messages.forbiddenHint}</AlertDescription>
      </Alert>
    );
  }

  if (overview.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>{messages.loadError}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <p>{getApiErrorMessage(overview.error, messages.loadError)}</p>
          <Button
            variant="outline"
            disabled={overview.isFetching}
            onClick={() => void overview.refetch()}
          >
            {overview.isFetching ? (
              <Spinner aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {overview.isFetching ? messages.refreshing : messages.retry}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (overview.isPending || session.isPending) {
    return (
      <section
        className="space-y-6"
        aria-busy="true"
        aria-label={messages.loading}
      >
        <p role="status" className="sr-only">
          {messages.loading}
        </p>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  const data = overview.data;
  const snapshotDate = new Date(`${data.as_of_date}T00:00:00Z`);
  const asOf = Number.isNaN(snapshotDate.getTime())
    ? data.as_of_date
    : new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(snapshotDate);

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {messages.asOf} <time dateTime={data.as_of_date}>{asOf}</time>
        </p>
        <Button asChild>
          <Link href="/hr/employees">
            {messages.directory}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <dl className="grid divide-y rounded-md border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          [messages.employees, data.total_employees],
          [messages.withoutStep, data.employees_without_step.length],
          [messages.gapCount, data.skill_gaps.length],
        ].map(([label, value]) => (
          <div key={label} className="p-5 sm:p-6">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
              {number.format(Number(value))}
            </dd>
          </div>
        ))}
      </dl>

      {data.total_employees === 0 && (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle>{messages.noEmployees}</EmptyTitle>
            <EmptyDescription>{messages.noEmployeesHint}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/import">{messages.import}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <section aria-labelledby="hr-gaps-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="hr-gaps-heading" className="text-xl font-semibold">
            {messages.gaps}
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {messages.gapsHint}
          </p>
        </div>
        {data.skill_gaps.length === 0 ? (
          <p className="rounded-md border p-5 text-sm text-muted-foreground">
            {messages.noGaps}
          </p>
        ) : (
          <div className="rounded-md border bg-card px-4 py-2">
            <Table aria-labelledby="hr-gaps-heading">
              <TableHeader>
                <TableRow>
                  <TableHead>{messages.skill}</TableHead>
                  <TableHead className="text-right">
                    {messages.affected}
                  </TableHead>
                  <TableHead className="text-right">
                    {messages.averageGap}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.skill_gaps.map((gap) => (
                  <TableRow key={gap.skill_id}>
                    <TableCell className="min-w-40 whitespace-normal py-4 font-medium">
                      {gap.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {number.format(gap.employees)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {number.format(gap.average_gap)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section aria-labelledby="hr-participation-heading" className="space-y-5">
        <div className="space-y-1">
          <h2 id="hr-participation-heading" className="text-xl font-semibold">
            {messages.participation}
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {messages.participationHint}
          </p>
        </div>
        {data.participation.length === 0 ? (
          <p className="rounded-md border p-5 text-sm text-muted-foreground">
            {messages.noParticipation}
          </p>
        ) : (
          <div className="space-y-6">
            <ParticipationGroup
              records={data.participation.filter((item) => !item.mandatory)}
              mandatory={false}
              messages={messages}
            />
            <ParticipationGroup
              records={data.participation.filter((item) => item.mandatory)}
              mandatory
              messages={messages}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="hr-without-step-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="hr-without-step-heading" className="text-xl font-semibold">
            {messages.withoutStepTitle}
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {messages.withoutStepHint}
          </p>
        </div>
        {data.employees_without_step.length === 0 ? (
          <p className="rounded-md border p-5 text-sm text-muted-foreground">
            {messages.allHaveStep}
          </p>
        ) : (
          <ul className="divide-y rounded-md border bg-card">
            {data.employees_without_step.map((employee) => (
              <li
                key={employee.employee_id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium break-words">
                    {employee.full_name}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {employee.role}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    {employee.reason}
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="shrink-0 self-start sm:self-center"
                >
                  <Link
                    href={`/hr/employees?employee=${encodeURIComponent(employee.employee_id)}`}
                    aria-label={`${messages.openProfile}: ${employee.full_name}`}
                  >
                    {messages.openProfile}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        {messages.privacy}
      </p>
    </div>
  );
}

function ParticipationGroup({
  records,
  mandatory,
  messages,
}: {
  records: HrOverviewData["participation"];
  mandatory: boolean;
  messages: HrOverviewMessages;
}) {
  const headingId = mandatory ? "hr-mandatory-heading" : "hr-voluntary-heading";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="text-base font-medium">
          {mandatory ? messages.mandatory : messages.voluntary}
        </h3>
      </div>
      {mandatory && (
        <p className="text-sm text-muted-foreground">
          {messages.mandatoryHint}
        </p>
      )}
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {mandatory ? messages.noMandatory : messages.noVoluntary}
        </p>
      ) : (
        <div className="rounded-md border bg-card px-4 py-2">
          <Table aria-labelledby={headingId}>
            <TableHeader>
              <TableRow>
                <TableHead>{messages.event}</TableHead>
                <TableHead className="text-right">
                  {messages.completed}
                </TableHead>
                <TableHead className="text-right">
                  {messages.inProgress}
                </TableHead>
                <TableHead className="text-right">{messages.other}</TableHead>
                <TableHead className="text-right">{messages.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((event) => (
                <TableRow key={event.event_id}>
                  <TableCell className="min-w-52 whitespace-normal py-4 font-medium">
                    {event.title}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event.completed}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event.in_progress}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {event.other}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {event.total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
