"use client";

import { AlertCircle, X } from "lucide-react";
import type { RefObject } from "react";

import { useSession } from "@/modules/auth";
import { mapProfileToView, useEmployeeProfile } from "@/modules/career-profile";
import { useCatalog } from "@/modules/catalog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Progress,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui";
import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";

import type { EmployeesDirectoryMessages } from "../model/employees-directory.messages";
import {
  DirectoryError,
  DirectoryForbidden,
  DirectorySkeleton,
} from "./DirectoryFeedback";

export function EmployeeProfileSheet({
  employeeId,
  onClose,
  returnFocus,
  messages,
  locale,
}: {
  employeeId: string | null;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
  messages: EmployeesDirectoryMessages;
  locale: string;
}) {
  const session = useSession();
  const isHr = session.isSuccess && session.data?.role === "hr";
  return (
    <Sheet
      open={Boolean(employeeId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto overscroll-contain data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          if (returnFocus.current?.isConnected) {
            event.preventDefault();
            returnFocus.current.focus({ preventScroll: true });
          }
        }}
      >
        <SheetHeader className="border-b p-6 pr-16">
          <SheetTitle className="text-xl font-semibold">
            {messages.profile}
          </SheetTitle>
          <SheetDescription>{messages.profileHint}</SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            aria-label={messages.close}
          >
            <X aria-hidden="true" />
          </Button>
        </SheetClose>
        <div className="p-5 sm:p-6">
          {isHr && employeeId ? (
            <EmployeeProfileDetails
              key={employeeId}
              employeeId={employeeId}
              messages={messages}
              locale={locale}
            />
          ) : (
            <DirectoryForbidden messages={messages} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmployeeProfileDetails({
  employeeId,
  messages,
  locale,
}: {
  employeeId: string;
  messages: EmployeesDirectoryMessages;
  locale: string;
}) {
  const profile = useEmployeeProfile(employeeId);
  const catalog = useCatalog();
  const catalogStatus = getApiErrorStatus(catalog.error);

  if (catalogStatus === 401 || catalogStatus === 403) {
    return <DirectoryForbidden messages={messages} />;
  }
  if (profile.isError) {
    return (
      <DirectoryError
        error={profile.error}
        title={messages.profileError}
        messages={messages}
        retry={() => void profile.refetch()}
        isFetching={profile.isFetching}
        profile
      />
    );
  }
  if (profile.isPending) {
    return <DirectorySkeleton label={messages.profileLoading} />;
  }

  const view = mapProfileToView(profile.data, catalog.data);
  const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(date);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="hr-profile-name">
        <div className="space-y-1">
          <h2
            id="hr-profile-name"
            className="text-2xl font-semibold break-words"
          >
            {view.employee.full_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {view.employee.department} · {view.employee.employee_id}
          </p>
        </div>
        <dl className="grid gap-5 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">
              {messages.currentPosition}
            </dt>
            <dd className="mt-1 font-medium">
              {view.employee.role} · {view.employee.grade}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{messages.target}</dt>
            <dd className="mt-1 font-medium">
              {view.target
                ? `${view.target.target_role} · ${view.target.target_grade}`
                : messages.noTarget}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          {view.targetSource === "explicit"
            ? messages.explicitTarget
            : view.targetSource === "next_grade"
              ? messages.automaticTarget
              : messages.targetNeeded}
        </p>
        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-sm font-medium">{messages.readiness}</p>
            <p className="text-3xl font-semibold tabular-nums">
              {view.readiness === null ? (
                <span className="text-base font-normal text-muted-foreground">
                  {messages.noCalculation}
                </span>
              ) : (
                `${Math.round(view.readiness)}%`
              )}
            </p>
          </div>
          {view.readiness !== null && (
            <Progress value={view.readiness} aria-label={messages.readiness} />
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {messages.readinessHint}
          </p>
        </div>
        <dl className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{messages.lastReview}</dt>
            <dd>{formatDate(view.employee.last_review_date)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{messages.workFormat}</dt>
            <dd>{messages[view.employee.work_format]}</dd>
          </div>
          {catalog.data?.as_of_date && (
            <div>
              <dt className="text-muted-foreground">{messages.asOf}</dt>
              <dd>{formatDate(catalog.data.as_of_date)}</dd>
            </div>
          )}
        </dl>
      </section>

      {view.warnings.length > 0 && (
        <Alert>
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{messages.warnings}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {view.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3" aria-labelledby="hr-profile-gaps">
        <h3 id="hr-profile-gaps" className="text-lg font-semibold">
          {messages.gaps}
        </h3>
        {view.gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {view.target ? messages.noGaps : messages.noGoalGaps}
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {view.gaps.map((gap) => (
              <li key={gap.skill_id} className="space-y-2 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{gap.name}</p>
                  <span className="text-sm tabular-nums">
                    {gap.current} → {gap.required}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {messages.gap}: {gap.gap}
                  </span>
                  {gap.critical && (
                    <Badge variant="secondary">{messages.critical}</Badge>
                  )}
                </div>
                {!gap.covered && (
                  <p className="text-sm text-muted-foreground">
                    {messages.uncovered}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="hr-profile-skills">
        <div>
          <h3 id="hr-profile-skills" className="text-lg font-semibold">
            {messages.skills}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {messages.skillsHint}
          </p>
        </div>
        {catalog.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            {messages.catalogLoading}
          </p>
        )}
        {catalog.isError && (
          <div className="space-y-2">
            <DirectoryError
              error={catalog.error}
              title={messages.catalogError}
              messages={messages}
              retry={() => void catalog.refetch()}
              isFetching={catalog.isFetching}
            />
            <p className="text-sm text-muted-foreground">
              {messages.catalogHint}
            </p>
          </div>
        )}
        {view.skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">{messages.noSkills}</p>
        ) : (
          <Table aria-labelledby="hr-profile-skills">
            <TableHeader>
              <TableRow>
                <TableHead>{messages.skill}</TableHead>
                <TableHead className="text-right">{messages.current}</TableHead>
                <TableHead className="text-right">
                  {messages.required}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.skills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell className="whitespace-normal py-3 font-medium">
                    {skill.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {skill.current}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {skill.required ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="hr-profile-history">
        <div>
          <h3 id="hr-profile-history" className="text-lg font-semibold">
            {messages.history}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {messages.historyHint}
          </p>
        </div>
        {view.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{messages.noHistory}</p>
        ) : (
          <ul className="divide-y">
            {view.history.map((record) => (
              <li key={record.record_id} className="space-y-2 py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{record.title}</p>
                  <Badge variant={record.mandatory ? "outline" : "secondary"}>
                    {record.mandatory ? messages.mandatory : messages.voluntary}
                  </Badge>
                </div>
                <p className="text-sm">
                  {messages[record.status]} · {messages.completion}:{" "}
                  {record.completion_pct}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {messages.recordDate}: {formatDate(record.date)}
                  {record.completed_at
                    ? ` · ${messages.completedDate}: ${formatDate(record.completed_at)}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
