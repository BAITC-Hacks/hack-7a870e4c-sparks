import {
  type GetEmployeesResult,
  type GetHrOverviewResult,
  getCareerQuestAPI,
} from "@/shared/api/generated";

const api = getCareerQuestAPI();

export type HrOverviewData = GetHrOverviewResult;
export type EmployeeSummary = GetEmployeesResult["employees"][number];

export const hrOverviewApi = {
  getOverview: (): Promise<HrOverviewData> => api.getHrOverview(),
  getEmployees: async (): Promise<EmployeeSummary[]> =>
    (await api.getEmployees()).employees,
};
