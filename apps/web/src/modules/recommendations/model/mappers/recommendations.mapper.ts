import type { RecommendationsResponse } from "../../api/recommendations.api";

type RecommendationResponse =
  RecommendationsResponse["recommendations"][number];

export type Recommendation = Omit<RecommendationResponse, "event"> & {
  event: Omit<RecommendationResponse["event"], "prerequisites"> & {
    prerequisites: Record<string, number>;
  };
};

export type RecommendationsResult = Omit<
  RecommendationsResponse,
  "recommendations"
> & {
  recommendations: Recommendation[];
};

export function mapRecommendations(
  response: RecommendationsResponse,
): RecommendationsResult {
  return {
    ...response,
    recommendations: response.recommendations.map((recommendation) => ({
      ...recommendation,
      event: {
        ...recommendation.event,
        prerequisites: Object.fromEntries(
          Object.entries(recommendation.event.prerequisites).map(
            ([skillId, level]) => {
              if (
                typeof level !== "number" ||
                !Number.isInteger(level) ||
                level < 0 ||
                level > 5
              ) {
                throw new Error(
                  "Не удалось проверить требования активности. Обновите рекомендации.",
                );
              }
              return [skillId, level];
            },
          ),
        ),
      },
    })),
  };
}
