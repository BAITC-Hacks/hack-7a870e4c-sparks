import { describe, expect, it } from "vitest";

import type { EmployeeSummary } from "@/modules/hr-overview";

import { type EmployeeFilters, filterEmployees } from "../filter-employees";

const employees: EmployeeSummary[] = [
  {
    employee_id: "person-z",
    full_name: "Әлия Тестовая",
    role: "Engineer",
    grade: "Middle",
    department: "Платформа",
  },
  {
    employee_id: "person-a",
    full_name: "Бекзат Проверочный",
    role: "Engineer",
    grade: "Senior",
    department: "Аналитика",
  },
  {
    employee_id: "person-b",
    full_name: "Гульнар Контрольная",
    role: "Analyst",
    grade: "Lead",
    department: "Аналитика",
  },
];
const defaults: EmployeeFilters = {
  q: "",
  department: "",
  role: "",
  grade: "",
  withoutStep: false,
};
const noStepIds = new Set(["person-a", "missing-from-directory"]);

describe("filterEmployees", () => {
  it("preserves API ordering and does not mutate employee rows", () => {
    expect(filterEmployees(employees, defaults, noStepIds)).toEqual(employees);
    expect(employees.map((employee) => employee.employee_id)).toEqual([
      "person-z",
      "person-a",
      "person-b",
    ]);
  });

  it.each([" әЛИЯ ", "PERSON-Z", "платформа"])(
    "searches names, arbitrary IDs and departments case-insensitively: %s",
    (q) => {
      expect(filterEmployees(employees, { ...defaults, q }, noStepIds)).toEqual(
        [employees[0]],
      );
    },
  );

  it("combines all exact filters and authoritative without-step membership", () => {
    expect(
      filterEmployees(
        employees,
        {
          q: "Engineer",
          department: "Аналитика",
          role: "Engineer",
          grade: "Senior",
          withoutStep: true,
        },
        noStepIds,
      ),
    ).toEqual([employees[1]]);
  });

  it("does not invent missing employees from the overview", () => {
    expect(
      filterEmployees(employees, { ...defaults, withoutStep: true }, noStepIds),
    ).toEqual([employees[1]]);
    expect(
      filterEmployees(employees, { ...defaults, withoutStep: true }, new Set()),
    ).toEqual([]);
  });

  it("returns empty results for stale URL filters and empty datasets", () => {
    expect(
      filterEmployees(
        employees,
        { ...defaults, department: "Removed department" },
        noStepIds,
      ),
    ).toEqual([]);
    expect(filterEmployees([], defaults, noStepIds)).toEqual([]);
  });
});
