"use client";

import { ArrowRight, Search, X } from "lucide-react";
import { useLocale } from "next-intl";
import { parseAsString, useQueryState, useQueryStates } from "nuqs";
import { useRef } from "react";

import { useSession } from "@/modules/auth";
import { type HrEmployeeSummary, useHrEmployees } from "@/modules/hr-overview";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { Link } from "@/shared/configs/i18/navigation";

import { employeesDirectoryMessages } from "../model/employees-directory.messages";
import {
  DirectoryError,
  DirectoryForbidden,
  DirectorySkeleton,
} from "./DirectoryFeedback";
import { EmployeeProfileSheet } from "./EmployeeProfileSheet";

export function EmployeesDirectory() {
  const locale = useLocale();
  const messages = employeesDirectoryMessages[locale === "kk" ? "kk" : "ru"];
  const session = useSession();
  const employees = useHrEmployees();
  const [filters, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      department: parseAsString.withDefault(""),
      role: parseAsString.withDefault(""),
      grade: parseAsString.withDefault(""),
    },
    { history: "replace", shallow: true },
  );
  const [employeeId, setEmployeeId] = useQueryState("employee", parseAsString);
  const returnFocus = useRef<HTMLElement | null>(null);

  if (!session.isPending && session.data?.role !== "hr") {
    return <DirectoryForbidden messages={messages} />;
  }
  if (employees.isError) {
    return (
      <DirectoryError
        error={employees.error}
        title={messages.loadError}
        messages={messages}
        retry={() => void employees.refetch()}
        isFetching={employees.isFetching}
      />
    );
  }
  if (employees.isPending || session.isPending) {
    return <DirectorySkeleton label={messages.loading} />;
  }

  const list = employees.data;
  const query = filters.q.trim().toLocaleLowerCase(locale);
  const filtered = list.filter((employee) => {
    const matchesSearch =
      !query ||
      [
        employee.full_name,
        employee.employee_id,
        employee.role,
        employee.department,
        employee.grade,
      ].some((value) => value.toLocaleLowerCase(locale).includes(query));
    return (
      matchesSearch &&
      (!filters.department || employee.department === filters.department) &&
      (!filters.role || employee.role === filters.role) &&
      (!filters.grade || employee.grade === filters.grade)
    );
  });
  const hasFilters = Object.values(filters).some(Boolean);
  const options = (field: "department" | "role" | "grade") => {
    const values: string[] = [
      ...new Set(list.map((employee) => employee[field])),
    ];
    const current = filters[field];
    if (current && !values.includes(current)) values.push(current);
    if (field === "grade") {
      const order = ["Junior", "Middle", "Senior", "Lead"];
      return values.sort(
        (left, right) => order.indexOf(left) - order.indexOf(right),
      );
    }
    return values.sort((left, right) => left.localeCompare(right, locale));
  };
  const openProfile = (employee: HrEmployeeSummary, trigger: HTMLElement) => {
    returnFocus.current = trigger;
    void setEmployeeId(employee.employee_id, { history: "push" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="space-y-4 rounded-md border bg-card p-4 sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="hr-employee-search">{messages.search}</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="hr-employee-search"
              type="search"
              className="pl-9"
              placeholder={messages.searchPlaceholder}
              value={filters.q}
              ref={(node) => {
                if (!returnFocus.current?.isConnected)
                  returnFocus.current = node;
              }}
              onChange={(event) =>
                void setFilters({ q: event.target.value || null })
              }
              aria-describedby="hr-filters-hint"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <DirectoryFilter
            id="hr-department-filter"
            label={messages.department}
            allLabel={messages.allDepartments}
            value={filters.department}
            options={options("department")}
            onChange={(value) => void setFilters({ department: value })}
          />
          <DirectoryFilter
            id="hr-role-filter"
            label={messages.role}
            allLabel={messages.allRoles}
            value={filters.role}
            options={options("role")}
            onChange={(value) => void setFilters({ role: value })}
          />
          <DirectoryFilter
            id="hr-grade-filter"
            label={messages.grade}
            allLabel={messages.allGrades}
            value={filters.grade}
            options={options("grade")}
            onChange={(value) => void setFilters({ grade: value })}
          />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p
            id="hr-filters-hint"
            className="max-w-2xl text-xs leading-relaxed text-muted-foreground"
          >
            {messages.filtersHint}
          </p>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void setFilters(null)}
            >
              <X aria-hidden="true" />
              {messages.reset}
            </Button>
          )}
        </div>
      </div>

      <section aria-labelledby="hr-directory-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="hr-directory-heading" className="text-xl font-semibold">
            {messages.employees}
          </h2>
          <p
            role="status"
            className="text-sm text-muted-foreground tabular-nums"
          >
            {messages.shown} {filtered.length} {messages.of} {list.length}
          </p>
        </div>
        {list.length === 0 ? (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyTitle>{messages.empty}</EmptyTitle>
              <EmptyDescription>{messages.emptyHint}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/import">{messages.import}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyTitle>{messages.noMatches}</EmptyTitle>
              <EmptyDescription>{messages.noMatchesHint}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => void setFilters(null)}>
                {messages.reset}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="hidden rounded-md border bg-card px-4 py-2 md:block">
              <Table aria-labelledby="hr-directory-heading">
                <TableHeader>
                  <TableRow>
                    <TableHead>{messages.employee}</TableHead>
                    <TableHead>{messages.department}</TableHead>
                    <TableHead>{messages.role}</TableHead>
                    <TableHead>{messages.grade}</TableHead>
                    <TableHead>
                      <span className="sr-only">{messages.openProfile}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((employee) => (
                    <TableRow
                      key={employee.employee_id}
                      data-state={
                        employeeId === employee.employee_id
                          ? "selected"
                          : undefined
                      }
                    >
                      <TableCell className="whitespace-normal py-4">
                        <p className="font-medium">{employee.full_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {employee.employee_id}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {employee.department}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {employee.role}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.grade}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${messages.openProfile}: ${employee.full_name}`}
                          aria-haspopup="dialog"
                          onClick={(event) =>
                            openProfile(employee, event.currentTarget)
                          }
                        >
                          <ArrowRight aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y rounded-md border bg-card md:hidden">
              {filtered.map((employee) => (
                <li key={employee.employee_id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words">
                        {employee.full_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {employee.employee_id}
                      </p>
                    </div>
                    <Badge variant="outline">{employee.grade}</Badge>
                  </div>
                  <p className="mt-3 text-sm">{employee.role}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {employee.department}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    aria-label={`${messages.openProfile}: ${employee.full_name}`}
                    aria-haspopup="dialog"
                    onClick={(event) =>
                      openProfile(employee, event.currentTarget)
                    }
                  >
                    {messages.openProfile}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <EmployeeProfileSheet
        employeeId={employeeId}
        onClose={() => void setEmployeeId(null, { history: "replace" })}
        returnFocus={returnFocus}
        messages={messages}
        locale={locale}
      />
    </div>
  );
}

function DirectoryFilter({
  id,
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ? `item:${value}` : "all"}
        onValueChange={(selection) =>
          onChange(selection === "all" ? null : selection.slice(5))
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={`item:${option}`}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
