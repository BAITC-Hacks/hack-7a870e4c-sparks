import {
  type GetCatalogResult,
  getCareerQuestAPI,
} from "@/shared/api/generated";

const api = getCareerQuestAPI();

export const catalogApi = {
  getCatalog: (): Promise<GetCatalogResult> => api.getCatalog(),
};
