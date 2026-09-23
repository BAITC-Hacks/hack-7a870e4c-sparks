"use client";

import { ArrowLeft, Construction, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { UserRole } from "@/entities/session";
import { Button } from "@/shared/components/ui";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/components/ui/empty";
import { Link } from "@/shared/configs/i18/navigation";

import { AppShell } from "./AppShell";
import { AuthGuard } from "./AuthGuard";

export function RolePage({ allowedRole, titleKey, descriptionKey, children }: { allowedRole: UserRole; titleKey: string; descriptionKey: string; children?: ReactNode }) {
  const t = useTranslations("auth");
  return (
    <AuthGuard allowedRole={allowedRole}>
      <AppShell title={t("pages." + titleKey)} description={t("pages." + descriptionKey)}>
        {children ?? (
          <Empty className="min-h-72 border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Construction aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>{t("unavailableTitle")}</EmptyTitle>
              <EmptyDescription>{t(allowedRole === "employee" ? "careerUnavailable" : "hrUnavailable")}</EmptyDescription>
            </EmptyHeader>
            {(allowedRole === "employee" || titleKey !== "hrTitle") && (
              <EmptyContent><Button asChild variant="outline"><Link href={allowedRole === "employee" ? "/employee/profile" : "/hr"}>
                {allowedRole === "employee" ? <Target aria-hidden="true" data-icon="inline-start" /> : <ArrowLeft aria-hidden="true" data-icon="inline-start" />}
                {t(allowedRole === "employee" ? "openProfile" : "backToOverview")}
              </Link></Button></EmptyContent>
            )}
          </Empty>
        )}
      </AppShell>
    </AuthGuard>
  );
}
