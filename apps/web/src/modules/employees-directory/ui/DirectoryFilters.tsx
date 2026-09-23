"use client";

import { useTranslations } from "next-intl";

import type { EmployeeSummary } from "@/modules/hr-overview";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import type { EmployeeFilters } from "../lib/filter-employees";

export function DirectoryFilters({
  employees,
  filters,
  onChange,
  onReset,
}: {
  employees: EmployeeSummary[];
  filters: EmployeeFilters;
  onChange: (value: Partial<EmployeeFilters>) => void;
  onReset: () => void;
}) {
  const t = useTranslations("employeesDirectory");
  const active = Boolean(
    filters.q ||
      filters.department ||
      filters.role ||
      filters.grade ||
      filters.withoutStep,
  );
  return (
    <div className="flex flex-col gap-4">
      <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="employee-search">{t("search")}</FieldLabel>
          <Input
            id="employee-search"
            type="search"
            value={filters.q}
            onChange={(event) => onChange({ q: event.target.value })}
            placeholder={t("searchHint")}
          />
        </Field>
        {(["department", "role", "grade"] as const).map((field) => {
          const options = [
            ...new Set([
              ...employees.map((employee) => employee[field]),
              ...(filters[field] ? [filters[field]] : []),
            ]),
          ];
          return (
            <Field key={field}>
              <FieldLabel htmlFor={`employee-${field}`}>{t(field)}</FieldLabel>
              <Select
                value={filters[field] ? `value:${filters[field]}` : "all"}
                onValueChange={(value) =>
                  onChange({ [field]: value === "all" ? "" : value.slice(6) })
                }
              >
                <SelectTrigger id={`employee-${field}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    {options.map((option) => (
                      <SelectItem key={option} value={`value:${option}`}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          );
        })}
      </FieldGroup>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Field orientation="horizontal" className="w-fit">
          <Checkbox
            id="employees-without-step"
            checked={filters.withoutStep}
            onCheckedChange={(checked) =>
              onChange({ withoutStep: checked === true })
            }
          />
          <FieldLabel htmlFor="employees-without-step">
            {t("withoutStep")}
          </FieldLabel>
        </Field>
        <Button variant="ghost" disabled={!active} onClick={onReset}>
          {t("reset")}
        </Button>
      </div>
    </div>
  );
}
