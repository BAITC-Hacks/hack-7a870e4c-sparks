import {
  type ChatWithCareerAdvisorBodyOne,
  type ChatWithCareerAdvisorResult,
  getCareerQuestAPI,
} from "@/shared/api/generated";

export type AdvisorMessage = NonNullable<
  ChatWithCareerAdvisorBodyOne["conversation_history"]
>[number];
export type AdvisorRequest = ChatWithCareerAdvisorBodyOne;
export type AdvisorResponse = ChatWithCareerAdvisorResult;

export const ADVISOR_MESSAGE_LIMIT = 3000;
export const ADVISOR_HISTORY_LIMIT = 20;

export class AdvisorValidationError extends Error {
  constructor(readonly field: "message" | "history") {
    super(`Invalid advisor ${field}`);
    this.name = "AdvisorValidationError";
  }
}

const api = getCareerQuestAPI();

export const careerAdvisorApi = {
  async chat(
    employeeId: string,
    body: AdvisorRequest,
  ): Promise<AdvisorResponse> {
    const message = body.message.trim();
    if (!message || message.length > ADVISOR_MESSAGE_LIMIT) {
      throw new AdvisorValidationError("message");
    }

    const history = body.conversation_history ?? [];
    if (
      history.length > ADVISOR_HISTORY_LIMIT ||
      history.some(
        (item) =>
          (item.role !== "user" && item.role !== "assistant") ||
          !item.content.trim() ||
          item.content.length > ADVISOR_MESSAGE_LIMIT,
      )
    ) {
      throw new AdvisorValidationError("history");
    }

    // Explicit fields keep profile data and employee IDs out of the body.
    return api.chatWithCareerAdvisor(employeeId, {
      message,
      conversation_history: history.map(({ role, content }) => ({
        role,
        content,
      })),
    });
  },
};
