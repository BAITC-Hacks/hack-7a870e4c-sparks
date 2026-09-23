"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Skeleton,
} from "@/shared/components/ui";
import { getApiErrorMessage } from "@/shared/lib/client/custom-instance";
import type { RecommendationsResult } from "../api/recommendations.api";

export function RecommendationLoading() {
  const t = useTranslations("recommendations");
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("loading")}
      className="space-y-4 rounded-md border p-6"
    >
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

export function RecommendationError({
  error,
  pending,
  retry,
}: {
  error: unknown;
  pending: boolean;
  retry: () => void;
}) {
  const t = useTranslations("recommendations");
  return (
    <Alert variant="destructive">
      <AlertTitle>{t("error")}</AlertTitle>
      <AlertDescription>
        <p>{getApiErrorMessage(error, t("error"))}</p>
        <Button
          className="mt-3"
          variant="outline"
          disabled={pending}
          onClick={retry}
        >
          {t("retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function RecommendationMode({
  response,
}: {
  response: RecommendationsResult;
}) {
  const t = useTranslations("recommendations");
  const format = useFormatter();
  const timestamp = new Date(response.generated_at);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{t(`mode.${response.mode}`)}</Badge>
        {response.mode === "ai" && response.model && (
          <span className="text-muted-foreground">{response.model}</span>
        )}
      </div>
      <p className="leading-6">{response.message}</p>
      <p className="text-xs text-muted-foreground">
        {t("calculationTime", {
          seconds: format.number(response.duration_ms / 1000, {
            maximumFractionDigits: 1,
          }),
        })}
        {Number.isFinite(timestamp.getTime()) && (
          <>
            {" "}
            ·{" "}
            <time dateTime={response.generated_at}>
              {format.dateTime(timestamp, {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: "Asia/Almaty",
              })}
            </time>
          </>
        )}
      </p>
    </div>
  );
}
