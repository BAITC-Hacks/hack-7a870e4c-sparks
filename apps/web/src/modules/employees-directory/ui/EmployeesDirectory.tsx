"use client";

import { AlertCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useRef } from "react";

import { useSession, useSessionExpiry } from "@/modules/auth";
import { HrEmployeeProfile } from "@/modules/career-profile";
import { useHrEmployees, useHrOverview } from "@/modules/hr-overview";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";

import { filterEmployees } from "../lib/filter-employees";
import { useDirectoryState } from "../model/queries/use-directory-state";
import { DirectoryFilters } from "./DirectoryFilters";
import { EmployeeList } from "./EmployeeList";

export function EmployeesDirectory() {
  const session = useSession();
  if (session.data?.role !== "hr") return null;
  return (
    <Suspense fallback={<DirectoryLoading />}>
      <DirectoryContent />
    </Suspense>
  );
}

function DirectoryContent() {
  const t = useTranslations("employeesDirectory");
  const [state, setState] = useDirectoryState();
  const employees = useHrEmployees();
  const overview = useHrOverview(state.withoutStep);
  const selected = state.employee || null;
  const trigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const error = employees.error ?? (state.withoutStep ? overview.error : null);
  useSessionExpiry(
    [employees.error, state.withoutStep ? overview.error : null].find(
      (value) => getApiErrorStatus(value) === 401,
    ),
  );
  const loading =
    employees.isPending || (state.withoutStep && overview.isPending);
  const reasons = new Map(
    (state.withoutStep
      ? (overview.data?.employees_without_step ?? [])
      : []
    ).map((item) => [item.employee_id, item.reason]),
  );
  const filtered = filterEmployees(
    employees.data ?? [],
    state,
    new Set(reasons.keys()),
  );

  return (
    <div className="flex flex-col gap-6">
      <h2 ref={heading} tabIndex={-1} className="sr-only">
        {t("listCaption")}
      </h2>
      <DirectoryFilters
        employees={employees.data ?? []}
        filters={state}
        onChange={(filters) => {
          void setState(filters);
        }}
        onReset={() => {
          void setState({
            q: null,
            department: null,
            role: null,
            grade: null,
            withoutStep: null,
          });
        }}
      />
      <p className="text-sm text-muted-foreground">{t("localFilters")}</p>
      {error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            {t(getApiErrorStatus(error) === 403 ? "forbidden" : "loadError")}
          </AlertTitle>
          <AlertDescription>
            <p>{getApiErrorMessage(error)}</p>
            {![401, 403].includes(getApiErrorStatus(error) ?? 0) && (
              <Button
                variant="outline"
                disabled={employees.isFetching || overview.isFetching}
                onClick={() => {
                  void employees.refetch();
                  if (state.withoutStep) void overview.refetch();
                }}
              >
                {t("retry")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <DirectoryLoading />
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {t("count", {
              count: filtered.length,
              total: employees.data?.length ?? 0,
            })}
          </p>
          {filtered.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {t(employees.data?.length ? "noMatches" : "empty")}
                </EmptyTitle>
                <EmptyDescription>
                  {t(
                    employees.data?.length
                      ? "noMatchesDescription"
                      : "emptyDescription",
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <EmployeeList
              employees={filtered}
              reasons={reasons}
              onSelect={(employeeId, element) => {
                trigger.current = element;
                void setState({ employee: employeeId }, { history: "push" });
              }}
            />
          )}
        </>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) void setState({ employee: null }, { history: "replace" });
        }}
      >
        <SheetContent
          showCloseButton={false}
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (trigger.current?.isConnected
              ? trigger.current
              : heading.current
            )?.focus();
          }}
        >
          <SheetHeader>
            <div className="flex items-start justify-between gap-4">
              <SheetTitle>{t("profileTitle")}</SheetTitle>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("closeProfile")}
                >
                  <X aria-hidden="true" />
                </Button>
              </SheetClose>
            </div>
            <SheetDescription>{t("profileDescription")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {selected && (
              <HrEmployeeProfile key={selected} employeeId={selected} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DirectoryLoading() {
  const t = useTranslations("employeesDirectory");
  return (
    <div
      role="status"
      aria-label={t("loading")}
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-8 w-48" />
      {[1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-16 w-full" />
      ))}
    </div>
  );
}
