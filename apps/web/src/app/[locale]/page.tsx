import { getTranslations } from "next-intl/server";

import type { User } from "@/entities/user";
import { UserProfile } from "@/modules/users";

/**
 * Роут — это ТОНКИЙ слой композиции (server component по умолчанию).
 *
 * Здесь только композиция фич, провайдеров и route-level данных. Server-state
 * приложения живет в module model hooks поверх Orval + TanStack Query.
 * Ниже — статичный пример, т.к. реального бэкенда в шаблоне нет.
 */
export default async function Home() {
  const t = await getTranslations();

  const now = new Date().toISOString();
  const user: User = {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    avatar: "",
    role: "admin",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      <h1 className="text-2xl font-bold">{t("welcome")}</h1>
      <UserProfile user={user} currentUser={user} />
    </main>
  );
}
