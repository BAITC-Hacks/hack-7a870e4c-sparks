import {
  type CompleteActivityResult,
  getCareerQuestAPI,
} from "@/shared/api/generated";

const api = getCareerQuestAPI();

export type ActivityCompletionResponse = CompleteActivityResult;

export const activitiesApi = {
  completeActivity: (
    employeeId: string,
    eventId: string,
  ): Promise<ActivityCompletionResponse> =>
    api.completeActivity(employeeId, eventId, {}),
};
