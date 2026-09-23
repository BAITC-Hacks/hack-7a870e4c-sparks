"use client";

import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { useLocale } from "next-intl";

import { useSession } from "@/modules/auth";
import { CareerAdvisor } from "@/modules/career-advisor";
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
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
} from "@/shared/components/ui";
import { Spinner } from "@/shared/components/ui/spinner";
import { Link } from "@/shared/configs/i18/navigation";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";

import {
  type CareerPlanMessages,
  careerPlanMessages,
} from "../model/career-plan.messages";
import {
  type CareerPlanViewModel,
  mapCareerPlan,
} from "../model/mappers/career-plan.mapper";
import { useCareerPlan } from "../model/queries/use-career-plan";
import { ChooseGoal } from "./ChooseGoal";

function percentage(value: number | null, messages: CareerPlanMessages) {
  return value === null ? messages.noCalculation : `${Math.round(value)}%`;
}

function dateLabel(
  value: string | null,
  locale: string,
  messages: CareerPlanMessages,
) {
  if (!value) return messages.noDate;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(date);
}

export function CareerPlanView() {
  const locale = useLocale();
  const messages = careerPlanMessages[locale === "kk" ? "kk" : "ru"];
  const session = useSession();
  const employeeId = session.data?.employee_id ?? null;
  const plan = useCareerPlan(employeeId);
  const catalog = useCatalog();
  const errorStatus = getApiErrorStatus(plan.error);
  const catalogErrorStatus = getApiErrorStatus(catalog.error);
  const accessDenied = [errorStatus, catalogErrorStatus].some(
    (status) => status === 401 || status === 403,
  );
  const view =
    plan.data && !accessDenied ? mapCareerPlan(plan.data, catalog.data) : null;

  if (!employeeId)
    return (
      <Alert>
        <AlertTitle>{messages.noEmployee}</AlertTitle>
      </Alert>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-start sm:justify-end">
        <Button asChild>
          <Link href="/employee">
            {messages.nextStep}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      {plan.isError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            {errorStatus === 503 ? messages.unavailable : messages.loadError}
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <p>{getApiErrorMessage(plan.error, messages.loadError)}</p>
            {view && <p>{messages.stale}</p>}
            <Button
              variant="outline"
              className="min-w-36"
              disabled={plan.isFetching}
              onClick={() => void plan.refetch()}
            >
              {plan.isFetching && <Spinner aria-hidden="true" />}
              {plan.isFetching ? messages.refreshing : messages.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {catalog.isError && (
        <Alert variant={accessDenied ? "destructive" : "default"}>
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{messages.catalogError}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <p>{getApiErrorMessage(catalog.error, messages.catalogError)}</p>
            {view && <p>{messages.catalogNote}</p>}
            <Button
              variant="outline"
              className="min-w-36"
              disabled={catalog.isFetching}
              onClick={() => void catalog.refetch()}
            >
              {catalog.isFetching && <Spinner aria-hidden="true" />}
              {catalog.isFetching ? messages.refreshing : messages.retryCatalog}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {plan.isPending && <PlanSkeleton label={messages.loading} />}

      {view && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardDescription>{messages.currentPosition}</CardDescription>
                  <CardTitle>
                    {view.current_position.role} · {view.current_position.grade}
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  className="min-w-40"
                  disabled={plan.isFetching}
                  onClick={() => void plan.refetch()}
                >
                  {plan.isFetching ? (
                    <Spinner aria-hidden="true" />
                  ) : (
                    <RefreshCw aria-hidden="true" data-icon="inline-start" />
                  )}
                  {plan.isFetching ? messages.refreshing : messages.refresh}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                {view.career_goal ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {messages.goal}
                    </p>
                    <p className="font-medium">
                      {view.career_goal.target_role} ·{" "}
                      {view.career_goal.target_grade}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {messages.goalSource[view.goal_source]}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-4 text-center">
                    <ChooseGoal />
                    <div>
                      <p className="font-medium">{messages.noGoal}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {messages.goalSource.none}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href="/employee/profile">{messages.editGoal}</Link>
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Readiness
                  value={view.readiness}
                  label={messages.currentReadiness}
                  messages={messages}
                />
                <Readiness
                  value={view.projected_readiness}
                  label={messages.projectedReadiness}
                  messages={messages}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {messages.readinessNote}
              </p>
              <p className="text-xs text-muted-foreground">
                {messages.asOf}: {dateLabel(view.as_of_date, locale, messages)}{" "}
                · {messages.lastReview}:{" "}
                {dateLabel(view.last_review_date, locale, messages)}
              </p>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle>{messages.trajectory}</CardTitle>
              <CardDescription>{messages.trajectoryNote}</CardDescription>
            </CardHeader>
            <CardContent>
              {view.trajectory.length ? (
                <ol className="space-y-4">
                  {view.trajectory.map((step, index) => (
                    <li key={step.event_id} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium"
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {messages.projected}:{" "}
                          {percentage(step.readiness_before, messages)} →{" "}
                          {percentage(step.readiness_after, messages)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {messages.noSteps}
                </p>
              )}
            </CardContent>
          </Card>

          <PlanRecommendations
            view={view}
            locale={locale}
            messages={messages}
          />

          <Card>
            <CardHeader>
              <CardTitle>{messages.skills}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {view.invalidSkillData && (
                <p className="text-sm text-muted-foreground">
                  {messages.invalidSkills}
                </p>
              )}
              {view.skills.length ? (
                view.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <p className="font-medium">{skill.name}</p>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">
                          {messages.current}
                        </dt>
                        <dd>{skill.current ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          {messages.projected}
                        </dt>
                        <dd>{skill.projected ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          {messages.required}
                        </dt>
                        <dd>{skill.required ?? "—"}</dd>
                      </div>
                    </dl>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {messages.noSkills}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{messages.gaps}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {view.gaps.length ? (
                view.gaps.map((gap) => (
                  <div
                    key={gap.skill_id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium">{gap.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {gap.current} / {gap.required} · {messages.gap}:{" "}
                        {gap.gap}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {gap.critical && (
                        <Badge variant="secondary">{messages.critical}</Badge>
                      )}
                      {!gap.covered && (
                        <Badge variant="outline">{messages.uncovered}</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {view.career_goal ? messages.noGaps : messages.noGoalGaps}
                </p>
              )}
            </CardContent>
          </Card>

          {view.uncoveredSkills.length > 0 && (
            <Alert>
              <AlertCircle aria-hidden="true" />
              <AlertTitle>{messages.uncovered}</AlertTitle>
              <AlertDescription>
                <p>{messages.uncoveredNote}</p>
                <ul className="mt-2 list-disc pl-4">
                  {view.uncoveredSkills.map((skill) => (
                    <li key={skill.id}>{skill.name}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{messages.mandatory}</CardTitle>
              <CardDescription>{messages.mandatoryNote}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {view.mandatory_tasks.length ? (
                view.mandatory_tasks.map((task) => (
                  <div
                    key={task.event_id}
                    className="flex flex-wrap items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {messages.dueDate}:{" "}
                        {dateLabel(task.due_date, locale, messages)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.status === "overdue" ? "destructive" : "outline"
                      }
                    >
                      {messages.statuses[task.status]}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {messages.noMandatory}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{messages.assessment}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{view.assessment_note}</p>
              <p className="font-medium">{messages.counted}</p>
              {view.counted_completions.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {view.counted_completions.map((completion) => (
                    <li key={completion} className="break-all">
                      {completion}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{messages.noCounted}</p>
              )}
              <p className="text-muted-foreground">{messages.countedNote}</p>
            </CardContent>
          </Card>
        </>
      )}

      {!accessDenied && <CareerAdvisor employeeId={employeeId} />}
    </div>
  );
}

function Readiness({
  value,
  label,
  messages,
}: {
  value: number | null;
  label: string;
  messages: CareerPlanMessages;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={
          value === null ? "text-lg font-medium" : "text-4xl font-semibold"
        }
      >
        {percentage(value, messages)}
      </p>
      {value !== null && (
        <Progress value={value} aria-valuenow={value} aria-label={label} />
      )}
    </div>
  );
}

function PlanRecommendations({
  view,
  locale,
  messages,
}: {
  view: CareerPlanViewModel;
  locale: string;
  messages: CareerPlanMessages;
}) {
  if (!view.recommendations.length) return null;
  return (
    <section aria-label={messages.recommendations} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{messages.recommendations}</h2>
        <p className="text-sm text-muted-foreground">
          {messages.recommendationsNote}
        </p>
      </div>
      {view.recommendations.map((recommendation, index) => (
        <Card
          key={recommendation.event.event_id}
          className={index === 0 ? "border-primary" : undefined}
        >
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant={index === 0 ? "default" : "outline"}>
                {index === 0 ? messages.primary : messages.alternative}
              </Badge>
              {recommendation.in_progress && (
                <Badge variant="secondary">{messages.inProgress}</Badge>
              )}
            </div>
            <CardTitle>{recommendation.event.title}</CardTitle>
            <CardDescription>
              {messages.formats[recommendation.event.format]} ·{" "}
              {recommendation.event.duration_hours} {messages.hours} ·{" "}
              {recommendation.next_session
                ? `${messages.session}: ${dateLabel(recommendation.next_session, locale, messages)}`
                : recommendation.event.format === "self_paced"
                  ? messages.selfPaced
                  : messages.noSession}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{recommendation.explanation}</p>
            <ul className="space-y-2 text-sm">
              {recommendation.factors.map((factor) => (
                <li key={factor.id}>
                  <span className="font-medium">
                    {messages.factors[factor.category]}:{" "}
                  </span>
                  {factor.text}
                </li>
              ))}
            </ul>
            {recommendation.gains.length > 0 && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{messages.projected}</p>
                {recommendation.gains.map((gain) => (
                  <p key={gain.skill_id}>
                    {gain.name}: {gain.before} → {gain.after} ·{" "}
                    {messages.required}: {gain.target}
                  </p>
                ))}
              </div>
            )}
            <Button asChild variant="outline">
              <Link
                href={`/employee/activity/${encodeURIComponent(recommendation.event.event_id)}`}
              >
                {messages.details}
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function PlanSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-6">
      <span className="sr-only">{label}</span>
      {["summary", "trajectory", "skills"].map((item) => (
        <Card key={item}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
