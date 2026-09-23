"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";

export function ActivityLoading() {
  const t = useTranslations("activities");
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("loading")}
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-48" />
    </div>
  );
}

export function ActivityError({
  error,
  onRetry,
  pending = false,
}: {
  error: unknown;
  onRetry?: () => void;
  pending?: boolean;
}) {
  const t = useTranslations("activities");
  const forbidden = getApiErrorStatus(error) === 403;
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{t(forbidden ? "forbidden" : "error")}</AlertTitle>
      <AlertDescription>
        <p>{getApiErrorMessage(error)}</p>
        {!forbidden && onRetry && (
          <Button variant="outline" disabled={pending} onClick={onRetry}>
            {t("retry")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
