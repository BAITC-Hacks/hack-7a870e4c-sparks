"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton } from "@/shared/components/ui";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Spinner } from "@/shared/components/ui/spinner";
import { useRouter } from "@/shared/configs/i18/navigation";
import { getApiErrorMessage } from "@/shared/lib/client/custom-instance";

import { useLogin } from "../model/mutations/use-login";
import { useSession } from "../model/queries/use-session";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LoginIllustration } from "./LoginIllustration";

export function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const login = useLogin();
  const t = useTranslations("auth");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session.data) router.replace(session.data.role === "hr" ? "/hr" : "/employee");
  }, [router, session.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password || login.isPending) return;
    login.mutate({ username: username.trim(), password }, {
      onSuccess: (user) => router.replace(user.role === "hr" ? "/hr" : "/employee"),
    });
  }

  return (
    <main className="flex min-h-svh flex-col bg-background px-4 py-6 sm:px-8">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <p className="font-semibold tracking-tight">Career Quest</p>
        <LanguageSwitcher />
      </header>
      <div className="mx-auto grid w-full max-w-5xl flex-1 content-center gap-8 py-8 md:grid-cols-[minmax(0,1fr)_400px] md:items-center md:gap-16 md:py-16">
        <section className="flex flex-col gap-5">
          <div className="hidden md:block"><LoginIllustration /></div>
          <h1 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t("introTitle")}</h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">{t("introDescription")}</p>
          <p className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><LockKeyhole aria-hidden="true" className="size-4 shrink-0" />{t("privacyHint")}</p>
        </section>
        <Card>
          {session.isPending || session.data ? (
            <>
              <CardHeader><p className="sr-only" role="status">{t("sessionLoading")}</p><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-full" /></CardHeader>
              <CardContent className="flex flex-col gap-4" aria-busy="true"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></CardContent>
            </>
          ) : (
            <>
              <CardHeader><CardTitle><h2>{t("title")}</h2></CardTitle><CardDescription>{t("description")}</CardDescription></CardHeader>
              <CardContent>
                <form className="flex flex-col gap-5" onSubmit={submit} aria-busy={login.isPending}>
                  {session.isError && <Alert variant="destructive"><AlertTitle>{t("sessionError")}</AlertTitle><AlertDescription>{getApiErrorMessage(session.error)}<Button type="button" variant="outline" size="sm" disabled={session.isFetching} onClick={() => void session.refetch()}><RotateCcw data-icon="inline-start" aria-hidden="true" />{t("retry")}</Button></AlertDescription></Alert>}
                  {login.isError && <Alert variant="destructive"><AlertTitle>{t("loginError")}</AlertTitle><AlertDescription>{getApiErrorMessage(login.error)}</AlertDescription></Alert>}
                  <FieldGroup>
                    <Field data-disabled={login.isPending}>
                      <FieldLabel htmlFor="username">{t("username")}</FieldLabel>
                      <Input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => { setUsername(event.target.value); login.reset(); }} required disabled={login.isPending} className="h-11" />
                    </Field>
                    <Field data-disabled={login.isPending}>
                      <div className="flex items-center justify-between gap-2"><FieldLabel htmlFor="password">{t("password")}</FieldLabel><Button type="button" variant="ghost" size="sm" disabled={login.isPending} aria-controls="password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff aria-hidden="true" data-icon="inline-start" /> : <Eye aria-hidden="true" data-icon="inline-start" />}{t(showPassword ? "hidePassword" : "showPassword")}</Button></div>
                      <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); login.reset(); }} required disabled={login.isPending} className="h-11" aria-describedby="role-hint" />
                      <FieldDescription id="role-hint">{t("roleHint")}</FieldDescription>
                    </Field>
                  </FieldGroup>
                  <Button className="h-11 w-full" type="submit" disabled={login.isPending || !username.trim() || !password}>
                    {login.isPending ? <Spinner aria-hidden="true" data-icon="inline-start" /> : null}
                    {login.isPending ? t("submitting") : t("submit")}
                    {!login.isPending && <ArrowRight aria-hidden="true" data-icon="inline-end" />}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
      <p className="mx-auto max-w-5xl text-center text-xs leading-5 text-muted-foreground">{t("demoHint")}</p>
    </main>
  );
}
