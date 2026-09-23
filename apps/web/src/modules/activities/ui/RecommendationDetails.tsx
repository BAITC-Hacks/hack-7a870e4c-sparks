"use client";

import { useTranslations } from "next-intl";

import type { Recommendation } from "@/modules/recommendations";
import { Badge } from "@/shared/components/ui/badge";

export function RecommendationDetails({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const t = useTranslations("activities");
  const { event } = recommendation;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{t(`format.${event.format}`)}</Badge>
        <Badge variant="outline">
          {t("duration", { hours: event.duration_hours })}
        </Badge>
        {recommendation.in_progress && (
          <Badge variant="outline">{t("inProgress")}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{event.description}</p>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{t("why")}</h3>
        <p className="text-sm">{recommendation.explanation}</p>
        <ul className="flex flex-col gap-2 text-sm">
          {recommendation.factors.map((factor) => (
            <li key={factor.id}>
              <span className="font-medium">
                {t(`factor.${factor.category}`)}:{" "}
              </span>
              {factor.text}
            </li>
          ))}
        </ul>
      </section>
      {recommendation.gains.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">{t("forecast")}</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {recommendation.gains.map((gain) => (
              <li key={gain.skill_id}>
                {gain.name}: {gain.before} → {gain.after} ·{" "}
                {t("required", { level: gain.target })}
              </li>
            ))}
          </ul>
        </section>
      )}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t("session")}</dt>
          <dd>
            {event.format === "self_paced"
              ? t("selfPaced")
              : (recommendation.next_session ?? t("noSession"))}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("audience")}</dt>
          <dd>
            {event.target_roles.join(", ")} · {event.target_grades.join(", ")}
          </dd>
        </div>
      </dl>
    </div>
  );
}
