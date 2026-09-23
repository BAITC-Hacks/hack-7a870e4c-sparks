"use client";

import { useTranslations } from "next-intl";

import { useSession } from "@/modules/auth";
import { useRecommendations } from "@/modules/recommendations";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { Link } from "@/shared/configs/i18/navigation";

import { ActivityError, ActivityLoading } from "./ActivityFeedback";

export function RecommendedActivities({ excludeId }: { excludeId?: string }) {
  const t = useTranslations("activities");
  const session = useSession();
  const query = useRecommendations(session.data?.employee_id ?? null);
  if (query.isPending || (excludeId && query.isFetching))
    return <ActivityLoading />;
  if (query.isError)
    return (
      <ActivityError
        error={query.error}
        pending={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );

  const recommendations = query.data.recommendations
    .filter(
      (item) => item.event.event_id !== excludeId && !item.event.mandatory,
    )
    .slice(0, 3);
  return (
    <section aria-label={t("nextStep")} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t("nextStep")}</h2>
        <Badge variant="secondary">
          {t(query.data.mode === "ai" ? "aiMode" : "rulesMode")}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{query.data.message}</p>
      {recommendations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("empty")}</EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-5">
          {recommendations.map((item, index) => (
            <article
              key={item.event.event_id}
              className="flex flex-col gap-3 border-b pb-5 last:border-b-0"
            >
              <h3 className="font-medium">{item.event.title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.explanation}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(`format.${item.event.format}`)} ·{" "}
                {t("duration", { hours: item.event.duration_hours })}
              </p>
              <Button
                asChild
                variant={index === 0 ? "default" : "outline"}
                className="w-fit"
              >
                <Link
                  href={`/employee/activity/${encodeURIComponent(item.event.event_id)}`}
                >
                  {t("details")}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
