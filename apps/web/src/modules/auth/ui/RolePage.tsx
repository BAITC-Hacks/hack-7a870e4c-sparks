"use client";

import { useTranslations } from "next-intl";
import type { UserRole } from "@/entities/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui";

import { AppShell } from "./AppShell";
import { AuthGuard } from "./AuthGuard";

export function RolePage({
  allowedRole,
  titleKey,
  descriptionKey,
}: {
  allowedRole: UserRole;
  titleKey: string;
  descriptionKey: string;
}) {
  const t = useTranslations("auth.pages");
  return (
    <AuthGuard allowedRole={allowedRole}>
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>{t(titleKey)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t(descriptionKey)}</p>
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
