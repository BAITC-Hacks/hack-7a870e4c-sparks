"use client";

import { type ReactNode, useEffect } from "react";

import type { UserRole } from "@/entities/session";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Skeleton,
} from "@/shared/components/ui";
import { useRouter } from "@/shared/configs/i18/navigation";
import { getApiErrorMessage } from "@/shared/lib/client/custom-instance";

import { useSession } from "../model/queries/use-session";

export function AuthGuard({
  allowedRole,
  children,
}: {
  allowedRole?: UserRole;
  children: ReactNode;
}) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (!session.isPending && !session.isError && !session.data)
      router.replace("/login");
  }, [router, session.data, session.isError, session.isPending]);

  if (session.isPending) return <Skeleton className="h-32 w-full" />;
  if (session.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Не удалось восстановить сессию</AlertTitle>
        <AlertDescription>{getApiErrorMessage(session.error)}</AlertDescription>
      </Alert>
    );
  }
  if (!session.data) return null;
  if (allowedRole && session.data.role !== allowedRole) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Доступ запрещён</AlertTitle>
        <AlertDescription>
          Этот раздел недоступен для вашей роли.
        </AlertDescription>
      </Alert>
    );
  }
  return <>{children}</>;
}
