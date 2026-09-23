"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/shared/components/ui";
import type { RecommendationView } from "../model/mappers/recommendations.mapper";

export function RecommendationContent({ item }: { item: RecommendationView }) {
  const t = useTranslations("recommendations");
  const format = useFormatter();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">{t(`format.${item.event.format}`)}</Badge>
        <span>{t("duration", { hours: item.event.duration_hours })}</span>
        <span className="text-muted-foreground">
          {item.event.format === "self_paced"
            ? t("selfPaced")
            : item.next_session
              ? t("nextSession", {
                  date: format.dateTime(
                    new Date(`${item.next_session}T12:00:00Z`),
                    { dateStyle: "medium", timeZone: "UTC" },
                  ),
                })
              : t("noSession")}
        </span>
        {item.in_progress && <Badge variant="outline">{t("inProgress")}</Badge>}
      </div>
      <div>
        <h3 className="mb-2 font-medium">{t("why")}</h3>
        <p className="whitespace-pre-wrap text-sm leading-6">
          {item.explanation}
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {item.factors.map((factor) => (
            <div key={factor.id} className="min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">
                {t(`factor.${factor.category}`)}
              </dt>
              <dd className="mt-1 text-sm leading-6">{factor.text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="mb-3 font-medium">{t("gains")}</h3>
        {item.gains.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noGains")}</p>
        ) : (
          <ul className="divide-y border-y">
            {item.gains.map((gain) => (
              <li
                key={gain.skill_id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-medium">{gain.name}</span>
                <span className="tabular-nums">
                  {t("gain", {
                    before: gain.before,
                    after: gain.after,
                    target: gain.target,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {t("forecastNote")}
        </p>
      </div>
      {!item.available && (
        <div className="rounded-md bg-muted p-4 text-sm" role="status">
          <p className="font-medium">{t("unavailable")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {item.blockedReasons.map((reason) => (
              <li key={reason}>{t(`blocked.${reason}`)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
