import {
  type GetEmployeesResult,
  type GetHrOverviewResult,
  getCareerQuestAPI,
} from "@/shared/api/generated";

export type HrOverviewData = GetHrOverviewResult;
export type HrEmployeeSummary = GetEmployeesResult["employees"][number];

const api = getCareerQuestAPI();

export const hrOverviewApi = {
  getOverview: (): Promise<HrOverviewData> => api.getHrOverview(),
  getEmployees: async (): Promise<HrEmployeeSummary[]> =>
    (await api.getEmployees()).employees,
};
