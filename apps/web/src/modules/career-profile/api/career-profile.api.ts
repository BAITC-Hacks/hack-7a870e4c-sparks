import {
  type GetProfileResult,
  getCareerQuestAPI,
  type UpdateGoalBodyOne,
  type UpdateGoalResult,
} from "@/shared/api/generated";

const api = getCareerQuestAPI();

export type UpdateCareerGoal = UpdateGoalBodyOne;

export const careerProfileApi = {
  getProfile: (employeeId: string): Promise<GetProfileResult> =>
    api.getProfile(employeeId),
  updateGoal: (
    employeeId: string,
    body: UpdateGoalBodyOne,
  ): Promise<UpdateGoalResult> => api.updateGoal(employeeId, body),
};
