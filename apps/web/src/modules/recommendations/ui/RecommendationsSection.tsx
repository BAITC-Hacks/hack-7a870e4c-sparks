"use client";

import { ArrowUpRight, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/shared/components/ui";
import { Empty, EmptyHeader, EmptyTitle } from "@/shared/components/ui/empty";
import { Link } from "@/shared/configs/i18/navigation";
import { useRecommendationView } from "../model/queries/use-recommendation-view";
import { RecommendationContent } from "./RecommendationContent";
import {
  RecommendationError,
  RecommendationLoading,
  RecommendationMode,
} from "./RecommendationStates";

export function RecommendationsSection() {
  const t = useTranslations("recommendations");
  const query = useRecommendationView();
  return (
    <section
      aria-labelledby="recommendations-title"
      className="flex min-w-0 flex-col gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="recommendations-title" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refresh()}
        >
          <RotateCcw
            aria-hidden="true"
            className={query.isFetching ? "motion-safe:animate-spin" : ""}
          />
          {t("refresh")}
        </Button>
      </div>
      {query.isPending ? (
        <RecommendationLoading />
      ) : (
        <>
          {query.error && (
            <RecommendationError
              error={query.error}
              pending={query.isFetching}
              retry={() => void query.refresh()}
            />
          )}
          {query.response && <RecommendationMode response={query.response} />}
          {query.response && query.items.length === 0 && (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{t("empty")}</EmptyTitle>
              </EmptyHeader>
              <Button asChild variant="outline">
                <Link href="/employee/profile">{t("editGoal")}</Link>
              </Button>
            </Empty>
          )}
          <div className="flex flex-col gap-6">
            {query.items.map((item, index) => (
              <article
                key={item.event.event_id}
                className={
                  index === 0
                    ? "flex min-w-0 flex-col gap-6 rounded-md border bg-card p-5 sm:p-6"
                    : "flex min-w-0 flex-col gap-6 border-t pt-6"
                }
              >
                <div className="space-y-3">
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    {t(index === 0 ? "primary" : "alternative")}
                  </Badge>
                  <h3
                    className={
                      index === 0
                        ? "text-2xl font-semibold tracking-tight"
                        : "text-lg font-semibold"
                    }
                  >
                    {item.event.title}
                  </h3>
                </div>
                <RecommendationContent item={item} />
                <div>
                  <Button
                    asChild
                    variant={
                      index === 0 && item.available && !query.error
                        ? "default"
                        : "outline"
                    }
                  >
                    <Link
                      href={`/employee/activity/${encodeURIComponent(item.event.event_id)}`}
                    >
                      {t("details")}
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
