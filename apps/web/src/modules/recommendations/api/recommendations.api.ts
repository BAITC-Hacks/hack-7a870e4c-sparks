import {
  type GetCatalogResult,
  type GetProfileResult,
  type GetRecommendationsResult,
  getCareerQuestAPI,
} from "@/shared/api/generated";

const api = getCareerQuestAPI();

export type RecommendationsResponse = GetRecommendationsResult;
export type RecommendationsResult = RecommendationsResponse;
export type Recommendation = RecommendationsResult["recommendations"][number];
export type RecommendationProfile = GetProfileResult;
export type RecommendationCatalog = GetCatalogResult;

export const recommendationsApi = {
  getRecommendations: (employeeId: string): Promise<RecommendationsResult> =>
    api.getRecommendations(employeeId, {}),
};
