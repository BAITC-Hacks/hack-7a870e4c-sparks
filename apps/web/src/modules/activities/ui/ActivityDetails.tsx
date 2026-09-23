"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSession } from "@/modules/auth";
import { useCareerPlan } from "@/modules/career-plan";
import { useEmployeeProfile } from "@/modules/career-profile";
import { useCatalog } from "@/modules/catalog";
import {
  getActivityAvailability,
  mapRecommendation,
  mapRecommendationData,
  RecommendationContent,
  RecommendationMode,
  useRecommendations,
} from "@/modules/recommendations";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { Separator } from "@/shared/components/ui/separator";
import { Spinner } from "@/shared/components/ui/spinner";
import { Link } from "@/shared/configs/i18/navigation";
import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";

import { useCompleteActivity } from "../model/mutations/use-complete-activity";
import { ActivityError, ActivityLoading } from "./ActivityFeedback";
import { ActivityResult } from "./ActivityResult";
import { RecommendedActivities } from "./RecommendedActivities";

export function ActivityDetails({ activityId }: { activityId: string }) {
  const session = useSession();
  const employeeId = session.data?.employee_id;
  if (!employeeId) return null;
  return (
    <EmployeeActivity
      key={`${employeeId}:${activityId}`}
      employeeId={employeeId}
      activityId={activityId}
    />
  );
}

function EmployeeActivity({
  employeeId,
  activityId,
}: {
  employeeId: string;
  activityId: string;
}) {
  const t = useTranslations("activities");
  const recommendationsT = useTranslations("recommendations");
  const profile = useEmployeeProfile(employeeId);
  const catalog = useCatalog();
  const recommendations = useRecommendations(employeeId);
  const complete = useCompleteActivity(employeeId);
  const currentRecommendation = recommendations.data?.recommendations.find(
    (item) => item.event.event_id === activityId,
  );
  const completedHistory = profile.data?.history.find(
    (item) =>
      item.event_id === activityId &&
      item.status === "completed" &&
      (activityId !== "EV_036" ||
        item.date === catalog.data?.as_of_date ||
        item.completed_at?.slice(0, 10) === catalog.data?.as_of_date),
  );
  const needsPlan = Boolean(
    profile.isSuccess &&
      catalog.isSuccess &&
      recommendations.isSuccess &&
      !currentRecommendation &&
      !completedHistory &&
      !complete.completion,
  );
  const plan = useCareerPlan(needsPlan ? employeeId : null);
  const planActivity = needsPlan
    ? plan.data?.recommendations.find(
        (item) => item.event.event_id === activityId,
      )
    : undefined;
  let recommendation = currentRecommendation;
  let planMappingError: unknown;
  if (!recommendation && planActivity) {
    try {
      recommendation = mapRecommendationData(planActivity);
    } catch (error) {
      planMappingError = error;
    }
  }
  const back = (
    <Button asChild variant="ghost" className="w-fit">
      <Link href="/employee">
        <ArrowLeft data-icon="inline-start" />
        {t("back")}
      </Link>
    </Button>
  );

  if (profile.isPending || catalog.isPending)
    return (
      <>
        {back}
        <ActivityLoading />
      </>
    );
  if (profile.isError || catalog.isError)
    return (
      <div className="flex flex-col gap-4">
        {back}
        <ActivityError
          error={profile.error ?? catalog.error}
          pending={profile.isFetching || catalog.isFetching}
          onRetry={() => {
            void profile.refetch();
            void catalog.refetch();
          }}
        />
      </div>
    );

  const skillNames = new Map(
    catalog.data.skills.map((skill) => [skill.skill_id, skill.name]),
  );
  if (complete.completion)
    return (
      <div className="flex flex-col gap-6">
        {back}
        <ActivityResult
          completion={complete.completion}
          asOfDate={catalog.data.as_of_date}
          skillNames={skillNames}
        />
        <Button disabled className="w-fit">
          {t("completed")}
        </Button>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/employee/profile">{t("viewHistory")}</Link>
        </Button>
        <Separator />
        <RecommendedActivities excludeId={activityId} />
      </div>
    );

  // A completed item disappears from recommendations; history keeps its permalink useful.
  if (!recommendation && completedHistory)
    return (
      <div className="flex flex-col gap-6">
        {back}
        <h2 className="text-xl font-semibold">{completedHistory.title}</h2>
        <Alert>
          <AlertTitle>{t("completed")}</AlertTitle>
          <AlertDescription>{t("historyCompletion")}</AlertDescription>
        </Alert>
        <p className="text-sm">
          {t("asOf", { date: catalog.data.as_of_date })}
        </p>
        {completedHistory.completed_at && (
          <p className="text-sm">
            {t("completionDate", {
              date: completedHistory.completed_at.slice(0, 10),
            })}
          </p>
        )}
        <Button disabled className="w-fit">
          {t("completed")}
        </Button>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/employee/profile">{t("viewHistory")}</Link>
        </Button>
        <RecommendedActivities excludeId={activityId} />
      </div>
    );

  if (recommendations.isPending || (needsPlan && plan.isPending))
    return (
      <>
        {back}
        <ActivityLoading />
      </>
    );
  if (
    recommendations.isError ||
    (needsPlan && plan.isError) ||
    planMappingError
  )
    return (
      <div className="flex flex-col gap-4">
        {back}
        <ActivityError
          error={recommendations.error ?? plan.error ?? planMappingError}
          pending={recommendations.isFetching || (needsPlan && plan.isFetching)}
          onRetry={() => {
            void recommendations.refetch();
            if (needsPlan) void plan.refetch();
          }}
        />
      </div>
    );
  if (!recommendation)
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("notAvailable")}</EmptyTitle>
            <EmptyDescription>{t("notAvailableDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );

  const view = mapRecommendation(recommendation, profile.data, catalog.data);
  const blocked = getActivityAvailability(
    recommendation,
    profile.data,
    catalog.data.as_of_date,
  );
  const forbidden = getApiErrorStatus(complete.error) === 403;
  const submit = () => {
    if (
      !complete.isPending &&
      blocked.length === 0 &&
      view.available &&
      !forbidden
    )
      complete.mutate(activityId);
  };

  return (
    <div className="flex flex-col gap-6">
      {back}
      <header className="flex flex-col gap-3">
        {!planActivity && recommendations.data && (
          <RecommendationMode response={recommendations.data} />
        )}
        <h2 className="text-2xl font-semibold">{recommendation.event.title}</h2>
      </header>
      <p className="text-sm text-muted-foreground">
        {recommendation.event.description}
      </p>
      <RecommendationContent item={view} />
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{t("audience")}</h3>
        <p className="text-sm">
          {recommendation.event.target_roles.join(", ")} ·{" "}
          {recommendation.event.target_grades.join(", ")}
        </p>
        <h3 className="font-medium">{t("prerequisites")}</h3>
        {Object.keys(recommendation.event.prerequisites).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noPrerequisites")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {view.prerequisites.map((requirement) => (
              <li key={requirement.id}>
                {requirement.name}:{" "}
                {recommendationsT("requirement", {
                  current: requirement.current ?? "—",
                  required: requirement.required ?? "—",
                })}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          {t("asOf", { date: catalog.data.as_of_date })}
        </p>
      </section>
      {blocked.length > 0 && (
        <Alert>
          <AlertTitle>{t("notAvailable")}</AlertTitle>
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {blocked.map((reason) => (
                <li key={reason}>{t(`blocked.${reason}`)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {complete.isError && (
        <ActivityError
          error={complete.error}
          onRetry={blocked.length === 0 ? submit : undefined}
          pending={complete.isPending}
        />
      )}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("demoNote")}</p>
        <Button
          className="w-fit min-w-56"
          disabled={
            blocked.length > 0 ||
            !view.available ||
            complete.isPending ||
            forbidden
          }
          onClick={submit}
        >
          {complete.isPending && (
            <Spinner aria-hidden="true" data-icon="inline-start" />
          )}
          {t(
            complete.isPending
              ? "submitting"
              : blocked.includes("completed")
                ? "completed"
                : "complete",
          )}
        </Button>
      </div>
    </div>
  );
}
