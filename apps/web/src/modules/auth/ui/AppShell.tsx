"use client";

import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui";
import { Link, usePathname, useRouter } from "@/shared/configs/i18/navigation";

import { useLogout } from "../model/mutations/use-logout";
import { useSession } from "../model/queries/use-session";

type NavigationItem = { href: string; label: string };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");
  const session = useSession();
  const logout = useLogout();
  const isHr = session.data?.role === "hr";
  const links: NavigationItem[] = isHr
    ? [
        { href: "/hr", label: t("nav.hrOverview") },
        { href: "/hr/employees", label: t("nav.employees") },
        { href: "/import", label: t("nav.import") },
      ]
    : [
        { href: "/employee", label: t("nav.overview") },
        { href: "/employee/career", label: t("nav.career") },
        { href: "/employee/profile", label: t("nav.profile") },
      ];
  const pageTitle =
    links.find((link) => pathname === link.href)?.label ?? t("nav.overview");

  function navigateToLocale(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  function Navigation({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav aria-label={t("navigation")} className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`rounded-md px-3 py-2 text-sm transition-colors duration-150 ${pathname === link.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/15 hover:text-foreground"}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  aria-label={t("openMenu")}
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Career Quest</SheetTitle>
                </SheetHeader>
                <div className="px-4">
                  <Navigation />
                </div>
              </SheetContent>
            </Sheet>
            <Link
              href={isHr ? "/hr" : "/employee"}
              className="font-semibold tracking-tight"
            >
              Career Quest
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="sr-only" htmlFor="language">
              {t("language")}
            </label>
            <select
              id="language"
              value={locale}
              onChange={(event) => navigateToLocale(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="ru">RU</option>
              <option value="kk">KK</option>
            </select>
            <span className="hidden text-muted-foreground sm:inline">
              {session.data?.full_name}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onSuccess: () => router.replace("/login"),
                })
              }
            >
              {t("logout")}
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 md:grid-cols-[240px_1fr] md:py-8">
        <aside className="hidden md:block">
          <Navigation />
        </aside>
        <main className="min-w-0">
          <div className="mb-6 border-b border-border pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Career Quest
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {pageTitle}
            </h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
