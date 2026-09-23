"use client";

import { AlertCircle, LockKeyhole, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";
import type { UserRole } from "@/entities/session";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Skeleton,
} from "@/shared/components/ui";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { Link, useRouter } from "@/shared/configs/i18/navigation";
import { getApiErrorMessage } from "@/shared/lib/client/custom-instance";
import { useSession } from "../model/queries/use-session";
import { useSessionExpiry } from "../model/use-session-expiry";

export function AuthGuard({
  allowedRole,
  children,
}: {
  allowedRole?: UserRole;
  children: ReactNode;
}) {
  useSessionExpiry();
  const router = useRouter();
  const t = useTranslations("auth");
  const session = useSession();

  useEffect(() => {
    if (!session.isPending && !session.isError && !session.data)
      router.replace("/login");
  }, [router, session.data, session.isError, session.isPending]);

  if (session.isPending || (!session.isError && !session.data))
    return (
      <main
        aria-busy="true"
        aria-label={t("sessionLoading")}
        className="mx-auto flex min-h-svh max-w-7xl flex-col gap-8 p-4 sm:p-8"
      >
        <p role="status" className="sr-only">
          {t("sessionLoading")}
        </p>
        <Skeleton className="h-12 w-full" />
        <div className="flex flex-col gap-4 md:ml-64">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-56 w-full" />
        </div>
      </main>
    );
  if (session.isError)
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-4 p-4">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            <h1>{t("sessionError")}</h1>
          </AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(session.error)}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          disabled={session.isFetching}
          onClick={() => void session.refetch()}
        >
          <RotateCcw aria-hidden="true" data-icon="inline-start" />
          {t("retry")}
        </Button>
        <Button variant="link" asChild>
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </main>
    );
  if (allowedRole && session.data?.role !== allowedRole)
    return (
      <main className="mx-auto flex min-h-svh max-w-lg items-center p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockKeyhole aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              <h1>{t("forbiddenTitle")}</h1>
            </EmptyTitle>
            <EmptyDescription>{t("forbiddenDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href={session.data?.role === "hr" ? "/hr" : "/employee"}>
                {t("backToOverview")}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  return <>{children}</>;
}
