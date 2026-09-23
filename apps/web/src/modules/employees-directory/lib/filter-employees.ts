import type { EmployeeSummary } from "@/modules/hr-overview";

export type EmployeeFilters = {
  q: string;
  department: string;
  role: string;
  grade: string;
  withoutStep: boolean;
};

export function filterEmployees(
  employees: EmployeeSummary[],
  filters: EmployeeFilters,
  withoutStepIds: ReadonlySet<string>,
) {
  const search = filters.q.trim().toLocaleLowerCase();
  return employees.filter((employee) => {
    const matchesSearch =
      !search ||
      [
        employee.full_name,
        employee.employee_id,
        employee.role,
        employee.department,
      ].some((value) => value.toLocaleLowerCase().includes(search));
    return (
      matchesSearch &&
      (!filters.department || employee.department === filters.department) &&
      (!filters.role || employee.role === filters.role) &&
      (!filters.grade || employee.grade === filters.grade) &&
      (!filters.withoutStep || withoutStepIds.has(employee.employee_id))
    );
  });
}
