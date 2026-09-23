"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@/shared/components/ui";
import { useRouter } from "@/shared/configs/i18/navigation";
import { getApiErrorMessage } from "@/shared/lib/client/custom-instance";

import { useLogin } from "../model/mutations/use-login";
import { useSession } from "../model/queries/use-session";
import { LoginIllustration } from "./LoginIllustration";

export function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const login = useLogin();
  const t = useTranslations("auth");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"employee" | "hr">("employee");

  useEffect(() => {
    if (session.data)
      router.replace(session.data.role === "hr" ? "/hr" : "/employee");
  }, [router, session.data]);

  if (session.isPending) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10">
        <div className="grid w-full gap-8 md:grid-cols-[1fr_420px] md:items-center">
          <section className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full max-w-lg" />
            <Skeleton className="h-12 w-full max-w-lg" />
          </section>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: (user) =>
          router.push(user.role === "hr" ? "/hr" : "/employee"),
      },
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10">
      <div className="grid w-full gap-8 md:grid-cols-[1fr_420px] md:items-center">
        <section className="space-y-4">
          <p className="text-sm font-medium text-primary">Career Quest</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {t("introTitle")}
          </h1>
          <p className="max-w-lg text-muted-foreground">
            {t("introDescription")}
          </p>
          <LoginIllustration />
        </section>
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              {session.isError && (
                <Alert variant="destructive">
                  <AlertTitle>{t("sessionError")}</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(session.error)}
                  </AlertDescription>
                </Alert>
              )}
              {login.isError && (
                <Alert variant="destructive">
                  <AlertTitle>{t("loginError")}</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(login.error)}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "employee" ? "default" : "ghost"}
                  onClick={() => setMode("employee")}
                >
                  {t("employeeMode")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "hr" ? "default" : "ghost"}
                  onClick={() => {
                    setMode("hr");
                    setUsername("hr");
                  }}
                >
                  {t("hrMode")}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t("username")}</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button
                className="w-full"
                type="submit"
                disabled={login.isPending}
              >
                {login.isPending ? t("submitting") : t("submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
