import { beforeEach, describe, expect, it, vi } from "vitest";

import { advisorFixture } from "../../model/__tests__/career-advisor.fixture";
import {
  AdvisorValidationError,
  careerAdvisorApi,
} from "../career-advisor.api";

const { chatWithCareerAdvisor } = vi.hoisted(() => ({
  chatWithCareerAdvisor: vi.fn(),
}));

vi.mock("@/shared/api/generated", () => ({
  getCareerQuestAPI: () => ({ chatWithCareerAdvisor }),
}));

describe("careerAdvisorApi", () => {
  beforeEach(() => vi.resetAllMocks());

  it("trims the message, sends only whitelisted fields, and returns the full response", async () => {
    const response = advisorFixture();
    chatWithCareerAdvisor.mockResolvedValue(response);
    const body = {
      message: "  Как развивать TypeScript? \n",
      conversation_history: [
        {
          role: "user" as const,
          content: "Хочу стать Senior",
          employee_id: "other",
        },
      ],
      employee_id: "other",
      profile: { full_name: "Must not be sent" },
      raw_history: [{ event_id: "private" }],
    };

    await expect(careerAdvisorApi.chat("from-session", body)).resolves.toBe(
      response,
    );
    expect(chatWithCareerAdvisor).toHaveBeenCalledWith("from-session", {
      message: "Как развивать TypeScript?",
      conversation_history: [{ role: "user", content: "Хочу стать Senior" }],
    });
  });

  it.each(["", " \n\t ", "x".repeat(3001)])(
    "rejects an empty or oversized message before transport",
    async (message) => {
      await expect(
        careerAdvisorApi.chat("employee-test", { message }),
      ).rejects.toMatchObject({
        name: "AdvisorValidationError",
        field: "message",
      });
      expect(chatWithCareerAdvisor).not.toHaveBeenCalled();
    },
  );

  it("accepts the maximum message and history size", async () => {
    chatWithCareerAdvisor.mockResolvedValue(advisorFixture());
    const history = Array.from({ length: 20 }, () => ({
      role: "user" as const,
      content: "x".repeat(3000),
    }));
    await careerAdvisorApi.chat("employee-test", {
      message: `  ${"x".repeat(3000)}  `,
      conversation_history: history,
    });
    expect(chatWithCareerAdvisor).toHaveBeenCalledWith("employee-test", {
      message: "x".repeat(3000),
      conversation_history: history,
    });
  });

  it.each([
    {
      history: Array.from({ length: 21 }, () => ({
        role: "user" as const,
        content: "hello",
      })),
    },
    { history: [{ role: "assistant" as const, content: " " }] },
    { history: [{ role: "assistant" as const, content: "x".repeat(3001) }] },
  ])("rejects invalid history before transport", async ({ history }) => {
    await expect(
      careerAdvisorApi.chat("employee-test", {
        message: "Помогите",
        conversation_history: history,
      }),
    ).rejects.toEqual(new AdvisorValidationError("history"));
    expect(chatWithCareerAdvisor).not.toHaveBeenCalled();
  });

  it("sends an empty history for a new dialog", async () => {
    chatWithCareerAdvisor.mockResolvedValue(advisorFixture());
    await careerAdvisorApi.chat("employee-test", { message: "Помогите" });
    expect(chatWithCareerAdvisor).toHaveBeenCalledWith("employee-test", {
      message: "Помогите",
      conversation_history: [],
    });
  });
});
