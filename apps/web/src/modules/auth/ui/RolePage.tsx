"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
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
  children,
}: {
  allowedRole: UserRole;
  titleKey: string;
  descriptionKey: string;
  children?: ReactNode;
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
        {children}
      </AppShell>
    </AuthGuard>
  );
}
