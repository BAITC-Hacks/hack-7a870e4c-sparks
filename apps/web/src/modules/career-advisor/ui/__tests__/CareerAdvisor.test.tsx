import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/lib/client/custom-instance";
import {
  type AdvisorResponse,
  careerAdvisorApi,
} from "../../api/career-advisor.api";
import { advisorFixture } from "../../model/__tests__/career-advisor.fixture";
import { CareerAdvisor } from "../CareerAdvisor";

vi.mock("../../api/career-advisor.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/career-advisor.api")>()),
  careerAdvisorApi: { chat: vi.fn() },
}));
vi.mock("next-intl", () => ({ useLocale: vi.fn(() => "ru") }));

function renderAdvisor(employeeId = "employee-test") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<CareerAdvisor employeeId={employeeId} />, { wrapper });
}

function send(message: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: message } });
  fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
}

describe("CareerAdvisor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useLocale).mockReturnValue("ru");
  });
  afterEach(cleanup);

  it("waits for a valid explicit submit, shows pending state, and keeps the reply in local dialog context", async () => {
    let complete!: (response: AdvisorResponse) => void;
    vi.mocked(careerAdvisorApi.chat).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    renderAdvisor();
    expect(careerAdvisorApi.chat).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: " \n " },
    });
    expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
    send("  Как развиваться?  ");

    await waitFor(() =>
      expect(careerAdvisorApi.chat).toHaveBeenCalledWith("employee-test", {
        message: "Как развиваться?",
        conversation_history: [],
      }),
    );
    expect(
      screen.getByRole("button", { name: "Советник готовит ответ…" }),
    ).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeDisabled();
    await act(async () => complete(advisorFixture("Начните с TypeScript.")));
    expect(await screen.findByRole("log")).toHaveTextContent(
      "Как развиваться?",
    );
    expect(screen.getByRole("log")).toHaveTextContent("Начните с TypeScript.");
    expect(screen.getByText("Расчётный режим · без AI")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");

    vi.mocked(careerAdvisorApi.chat).mockResolvedValue(
      advisorFixture("Обсудите цель."),
    );
    send("А дальше?");
    await screen.findByText("Обсудите цель.");
    expect(careerAdvisorApi.chat).toHaveBeenLastCalledWith("employee-test", {
      message: "А дальше?",
      conversation_history: [
        { role: "user", content: "Как развиваться?" },
        { role: "assistant", content: "Начните с TypeScript." },
      ],
    });
  });

  it("retains the draft on a 503 and only resends after an explicit retry", async () => {
    vi.mocked(careerAdvisorApi.chat)
      .mockRejectedValueOnce(new ApiError("Agent unavailable", 503))
      .mockResolvedValueOnce(advisorFixture("Теперь доступно."));
    renderAdvisor();
    send("Как развиваться?");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI-советник временно недоступен",
    );
    expect(screen.getByRole("textbox")).toHaveValue("Как развиваться?");
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    expect(careerAdvisorApi.chat).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Повторить отправку" }));
    expect(await screen.findByRole("log")).toHaveTextContent(
      "Теперь доступно.",
    );
    expect(careerAdvisorApi.chat).toHaveBeenCalledTimes(2);
  });

  it("shows backend errors without appending failed messages to history", async () => {
    vi.mocked(careerAdvisorApi.chat).mockRejectedValue(
      new ApiError("Лимит запросов", 429),
    );
    renderAdvisor();
    send("Как развиваться?");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Лимит запросов",
    );
    expect(screen.getByRole("textbox")).toHaveValue("Как развиваться?");
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
  });

  it("sends at most the last twenty turns and bounds long assistant replies in request history", async () => {
    vi.mocked(careerAdvisorApi.chat).mockResolvedValue(
      advisorFixture("x".repeat(3001)),
    );
    renderAdvisor();
    for (let index = 0; index < 12; index += 1) {
      send(`Вопрос ${index}`);
      await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
    }

    const body = vi.mocked(careerAdvisorApi.chat).mock.calls.at(-1)?.[1];
    expect(body?.conversation_history).toHaveLength(20);
    expect(body?.conversation_history?.[0]).toEqual({
      role: "user",
      content: "Вопрос 1",
    });
    expect(body?.conversation_history?.at(-1)?.content).toHaveLength(3000);
    expect(screen.getByRole("log")).toHaveTextContent("x".repeat(3001));
  });

  it("clears draft and dialog when the session employee changes", async () => {
    vi.mocked(careerAdvisorApi.chat).mockResolvedValue(
      advisorFixture("Ответ первому сотруднику."),
    );
    const { rerender } = renderAdvisor("first");
    send("Первый вопрос");
    await screen.findByText("Ответ первому сотруднику.");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Личный черновик" },
    });
    rerender(<CareerAdvisor employeeId="second" />);

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    send("Другой вопрос");
    await waitFor(() =>
      expect(careerAdvisorApi.chat).toHaveBeenLastCalledWith("second", {
        message: "Другой вопрос",
        conversation_history: [],
      }),
    );
  });

  it("clears dialog history after New dialog", async () => {
    vi.mocked(careerAdvisorApi.chat).mockResolvedValue(advisorFixture());
    renderAdvisor();
    send("Первый вопрос");
    await screen.findByRole("log");
    fireEvent.click(screen.getByRole("button", { name: "Новый диалог" }));
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    send("Новый вопрос");
    await waitFor(() =>
      expect(careerAdvisorApi.chat).toHaveBeenLastCalledWith("employee-test", {
        message: "Новый вопрос",
        conversation_history: [],
      }),
    );
  });

  it("renders the Kazakh form and unavailable state", async () => {
    vi.mocked(useLocale).mockReturnValue("kk");
    vi.mocked(careerAdvisorApi.chat).mockRejectedValue(
      new ApiError("Agent unavailable", 503),
    );
    renderAdvisor();
    expect(
      screen.getByRole("heading", { name: "AI-кеңесші" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Сұрағыңыз" }), {
      target: { value: "Қалай дамуға болады?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Жіберу" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI-кеңесші уақытша қолжетімсіз",
    );
  });
});
