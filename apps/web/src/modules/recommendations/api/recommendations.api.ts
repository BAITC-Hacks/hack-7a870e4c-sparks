import {
  type GetRecommendationsResult,
  getCareerQuestAPI,
} from "@/shared/api/generated";

const api = getCareerQuestAPI();

export type RecommendationsResponse = GetRecommendationsResult;

export const recommendationsApi = {
  getRecommendations: (employeeId: string): Promise<RecommendationsResponse> =>
    api.getRecommendations(employeeId, {}),
};
