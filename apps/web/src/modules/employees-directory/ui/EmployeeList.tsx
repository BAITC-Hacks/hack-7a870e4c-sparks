"use client";

import { useTranslations } from "next-intl";

import type { EmployeeSummary } from "@/modules/hr-overview";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

export function EmployeeList({
  employees,
  reasons,
  onSelect,
}: {
  employees: EmployeeSummary[];
  reasons: ReadonlyMap<string, string>;
  onSelect: (employeeId: string, trigger: HTMLButtonElement) => void;
}) {
  const t = useTranslations("employeesDirectory");
  const nameButton = (employee: EmployeeSummary) => (
    <Button
      variant="link"
      className="h-auto max-w-full justify-start whitespace-normal p-0 text-left"
      aria-haspopup="dialog"
      onClick={(event) => onSelect(employee.employee_id, event.currentTarget)}
    >
      {employee.full_name}
    </Button>
  );

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableCaption>{t("listCaption")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("employee")}</TableHead>
              <TableHead scope="col">{t("role")}</TableHead>
              <TableHead scope="col">{t("grade")}</TableHead>
              <TableHead scope="col">{t("department")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.employee_id}>
                <TableCell className="max-w-80 whitespace-normal">
                  {nameButton(employee)}
                  <p className="text-xs text-muted-foreground">
                    {employee.employee_id}
                  </p>
                  {reasons.get(employee.employee_id) && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {reasons.get(employee.employee_id)}
                    </p>
                  )}
                </TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  {employee.role}
                </TableCell>
                <TableCell>{employee.grade}</TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  {employee.department}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul
        aria-label={t("listCaption")}
        className="flex flex-col divide-y md:hidden"
      >
        {employees.map((employee) => (
          <li key={employee.employee_id} className="flex flex-col gap-3 py-4">
            {nameButton(employee)}
            <p className="text-xs text-muted-foreground">
              {employee.employee_id}
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">{t("role")}</dt>
              <dd className="break-words">{employee.role}</dd>
              <dt className="text-muted-foreground">{t("grade")}</dt>
              <dd>{employee.grade}</dd>
              <dt className="text-muted-foreground">{t("department")}</dt>
              <dd className="break-words">{employee.department}</dd>
            </dl>
            {reasons.get(employee.employee_id) && (
              <p className="text-sm text-muted-foreground">
                {reasons.get(employee.employee_id)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
