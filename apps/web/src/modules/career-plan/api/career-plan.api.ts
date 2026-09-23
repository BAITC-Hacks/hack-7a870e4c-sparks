import {
  type GetCareerPlanResult,
  type GetCatalogResult,
  getCareerQuestAPI,
} from "@/shared/api/generated";

export type CareerPlanDto = GetCareerPlanResult;
export type CareerPlanCatalogDto = GetCatalogResult;

const api = getCareerQuestAPI();

export const careerPlanApi = {
  getPlan: (employeeId: string): Promise<CareerPlanDto> =>
    api.getCareerPlan(employeeId),
};
