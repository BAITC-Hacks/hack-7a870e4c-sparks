import {
  type GetSessionResult,
  getCareerQuestAPI,
  type LoginBodyOne,
  type LoginResult,
  type LogoutResult,
} from "@/shared/api/generated";

const api = getCareerQuestAPI();

export const authApi = {
  login: (credentials: LoginBodyOne): Promise<LoginResult> =>
    api.login(credentials),
  getSession: (): Promise<GetSessionResult> => api.getSession(),
  logout: (): Promise<LogoutResult> => api.logout(),
};
