"use client";

import { ArrowUpRight, ChartNoAxesCombined, House, LogOut, Menu, Route, Upload, UserRound, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

import { Alert, AlertDescription, AlertTitle, Badge, Button, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui";
import { Spinner } from "@/shared/components/ui/spinner";
import { Link, usePathname, useRouter } from "@/shared/configs/i18/navigation";
import { getApiErrorMessage } from "@/shared/lib/client/custom-instance";
import { cn } from "@/shared/lib/utils";

import { useLogout } from "../model/mutations/use-logout";
import { useSession } from "../model/queries/use-session";
import { LanguageSwitcher } from "./LanguageSwitcher";

type NavigationItem = { href: string; label: string; icon: typeof House };

function Navigation({ links, onNavigate }: { links: NavigationItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("auth");
  return (
    <nav aria-label={t("navigation")} className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={onNavigate}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-4 shrink-0" />{label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHr = session.data?.role === "hr";
  const links: NavigationItem[] = isHr
    ? [
        { href: "/hr", label: t("nav.hrOverview"), icon: ChartNoAxesCombined },
        { href: "/hr/employees", label: t("nav.employees"), icon: Users },
        { href: "/import", label: t("nav.import"), icon: Upload },
      ]
    : [
        { href: "/employee", label: t("nav.overview"), icon: House },
        { href: "/employee/career", label: t("nav.career"), icon: Route },
        { href: "/employee/profile", label: t("nav.profile"), icon: UserRound },
      ];
  const roleLabel = t(isHr ? "hrMode" : "employeeMode");

  return (
    <div className="min-h-svh bg-background">
      <a href="#main-content" className="sr-only rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">{t("skipToContent")}</a>
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild><Button variant="outline" size="icon" className="md:hidden" aria-label={t("openMenu")}><Menu aria-hidden="true" /></Button></SheetTrigger>
              <SheetContent side="left">
                <SheetHeader><SheetTitle>Career Quest</SheetTitle><SheetDescription>{roleLabel}</SheetDescription></SheetHeader>
                <div className="px-4"><Navigation links={links} onNavigate={() => setMenuOpen(false)} /></div>
              </SheetContent>
            </Sheet>
            <Link href={isHr ? "/hr" : "/employee"} className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span aria-hidden="true" className="hidden size-9 items-center justify-center rounded-md bg-primary text-primary-foreground sm:flex"><ArrowUpRight className="size-5" /></span>
              <span>Career Quest</span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <div className="hidden max-w-44 flex-col text-right text-sm lg:flex"><span className="truncate font-medium">{session.data?.full_name}</span><span className="text-xs text-muted-foreground">{roleLabel}</span></div>
            <Button variant="ghost" size="sm" disabled={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace("/login") })} aria-label={t("logout")}>
              {logout.isPending ? <Spinner aria-hidden="true" data-icon="inline-start" /> : <LogOut aria-hidden="true" data-icon="inline-start" />}
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 md:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-10">
        <aside className="hidden md:block">
          <div className="sticky top-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2 px-3"><Badge variant="secondary">{roleLabel}</Badge><p className="text-sm text-muted-foreground">{t(isHr ? "hrWorkspace" : "employeeWorkspace")}</p></div>
            <Navigation links={links} /><Separator />
            <p className="px-3 text-xs leading-5 text-muted-foreground">{t("privacyHint")}</p>
          </div>
        </aside>
        <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-col gap-8 outline-none">
          <div className="flex flex-col gap-2"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>
          {logout.isError && <Alert variant="destructive"><AlertTitle>{t("logoutError")}</AlertTitle><AlertDescription>{getApiErrorMessage(logout.error)}</AlertDescription></Alert>}
          {children}
        </main>
      </div>
    </div>
  );
}
