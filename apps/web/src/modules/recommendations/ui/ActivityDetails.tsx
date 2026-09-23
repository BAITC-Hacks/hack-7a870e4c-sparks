"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/shared/components/ui";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { Link } from "@/shared/configs/i18/navigation";
import { useRecommendationView } from "../model/queries/use-recommendation-view";
import { RecommendationContent } from "./RecommendationContent";
import {
  RecommendationError,
  RecommendationLoading,
  RecommendationMode,
} from "./RecommendationStates";

export function ActivityDetails({ activityId }: { activityId: string }) {
  const t = useTranslations("recommendations");
  const query = useRecommendationView(activityId);
  const item = query.activity;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <Button asChild variant="link" className="px-0">
          <Link href="/employee">
            <ArrowLeft aria-hidden="true" />
            {t("back")}
          </Link>
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
          {!item && !query.error && (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{t("notFound")}</EmptyTitle>
                <EmptyDescription>{t("notFoundDescription")}</EmptyDescription>
              </EmptyHeader>
              <Button
                variant="outline"
                disabled={query.isFetching}
                onClick={() => void query.refresh()}
              >
                {t("refresh")}
              </Button>
            </Empty>
          )}
          {item && (
            <>
              <header className="space-y-3">
                <Badge variant="outline">
                  {t(
                    item.available && !query.error
                      ? "available"
                      : "unavailable",
                  )}
                </Badge>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {item.event.title}
                </h2>
                <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {item.event.description}
                </p>
              </header>
              {query.response && (
                <RecommendationMode response={query.response} />
              )}
              <RecommendationContent item={item} />
              <section
                className="border-t pt-6"
                aria-labelledby="activity-requirements"
              >
                <h3
                  id="activity-requirements"
                  className="mb-4 text-lg font-semibold"
                >
                  {t("requirements")}
                </h3>
                <dl className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {t("audience")}
                    </dt>
                    <dd className="mt-1 text-sm leading-6">
                      {item.event.target_roles.join(", ")} ·{" "}
                      {item.event.target_grades.join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {t("prerequisites")}
                    </dt>
                    <dd className="mt-1 text-sm leading-6">
                      {item.prerequisites.length === 0 ? (
                        t("noPrerequisites")
                      ) : (
                        <ul className="space-y-1">
                          {item.prerequisites.map((requirement) => (
                            <li key={requirement.id}>
                              {requirement.name}:{" "}
                              {t("requirement", {
                                current: requirement.current ?? "—",
                                required: requirement.required ?? "—",
                              })}
                            </li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
              <p className="rounded-md bg-muted p-4 text-sm leading-6 text-muted-foreground">
                {t("previewOnly")}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
