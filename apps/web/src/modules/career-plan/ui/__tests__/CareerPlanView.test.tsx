import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/lib/client/custom-instance";

import { careerPlanApi } from "../../api/career-plan.api";
import { planFixture } from "../../model/__tests__/career-plan.fixture";
import { CareerPlanView } from "../CareerPlanView";

const catalogState = vi.hoisted(() => ({
  data: undefined,
  error: null as unknown,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
}));

vi.mock("../../api/career-plan.api", () => ({
  careerPlanApi: { getPlan: vi.fn() },
}));
vi.mock("@/modules/auth", () => ({
  useSession: () => ({ data: { employee_id: "employee-test" } }),
}));
vi.mock("@/modules/catalog", () => ({
  useCatalog: () => catalogState,
}));
vi.mock("@/modules/career-advisor", () => ({
  CareerAdvisor: () => <div>Advisor</div>,
}));
vi.mock("@/shared/configs/i18/navigation", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

function renderPlan() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CareerPlanView />
    </QueryClientProvider>,
  );
}

describe("CareerPlanView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    catalogState.error = null;
    catalogState.isError = false;
  });
  afterEach(cleanup);

  it("renders current and forecast progress, warnings, mandatory tasks, and assessment separately", async () => {
    vi.mocked(careerPlanApi.getPlan).mockResolvedValue(
      planFixture({
        uncovered_skills: ["SK_TEST_DESIGN"],
        mandatory_tasks: [
          {
            event_id: "mandatory-test",
            title: "Compliance",
            status: "overdue",
            due_date: "2026-09-15",
          },
        ],
        warnings: ["Навык не покрыт каталогом"],
      }),
    );
    renderPlan();
    expect(
      await screen.findByText("Текущее покрытие требований"),
    ).toBeInTheDocument();
    expect(screen.getByText("Прогноз покрытия требований")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Текущее покрытие требований" }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(
      screen.getByRole("progressbar", { name: "Прогноз покрытия требований" }),
    ).toHaveAttribute("aria-valuenow", "75");
    expect(screen.getByText("Compliance")).toBeInTheDocument();
    expect(screen.getByText("Compliance").closest("a")).toBeNull();
    expect(screen.getByText("Просрочено")).toBeInTheDocument();
    expect(screen.getByText("Навык не покрыт каталогом")).toBeInTheDocument();
    expect(screen.getByText("completion-42")).toBeInTheDocument();
    expect(
      screen.getByText("Учитываются только завершения после оценки."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Подробнее" })).toHaveAttribute(
      "href",
      "/employee/activity/event-test",
    );
    expect(
      screen.getByRole("link", { name: "Посмотреть следующий шаг" }),
    ).toHaveAttribute("href", "/employee");
  });

  it("shows an explicit goal CTA and no zero progress for Lead without a target", async () => {
    vi.mocked(careerPlanApi.getPlan).mockResolvedValue(
      planFixture({
        career_goal: null,
        goal_source: "none",
        readiness: null,
        projected_readiness: null,
        trajectory: [],
        recommendations: [],
        gaps: [],
      }),
    );
    renderPlan();
    expect(
      await screen.findByRole("link", { name: "Задать карьерную цель" }),
    ).toHaveAttribute("href", "/employee/profile");
    expect(screen.getAllByText("Нет расчёта")).toHaveLength(2);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Задайте карьерную цель, чтобы увидеть требования и пробелы в навыках.",
      ),
    ).toBeInTheDocument();
  });

  it("retains the calculated state and labels it stale after a 503", async () => {
    vi.mocked(careerPlanApi.getPlan)
      .mockResolvedValueOnce(planFixture())
      .mockRejectedValueOnce(new ApiError("Agent unavailable", 503));
    renderPlan();
    fireEvent.click(
      await screen.findByRole("button", { name: "Обновить план" }),
    );
    expect(
      await screen.findByText("AI-сервис и карьерный план временно недоступны"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ниже сохранён последний расчёт/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Текущее покрытие требований" }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(
      screen.getByRole("button", { name: "Повторить" }),
    ).toBeInTheDocument();
  });

  it("hides cached plan details when access is denied", async () => {
    vi.mocked(careerPlanApi.getPlan)
      .mockResolvedValueOnce(planFixture())
      .mockRejectedValueOnce(new ApiError("Forbidden", 403));
    renderPlan();
    fireEvent.click(
      await screen.findByRole("button", { name: "Обновить план" }),
    );
    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
    expect(
      screen.queryByText("Текущее покрытие требований"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("completion-42")).not.toBeInTheDocument();
    expect(screen.queryByText("Advisor")).not.toBeInTheDocument();
  });

  it("preserves the plan with a retry when the supplementary catalog fails", async () => {
    vi.mocked(careerPlanApi.getPlan).mockResolvedValue(planFixture());
    catalogState.error = new ApiError("Catalog unavailable", 503);
    catalogState.isError = true;
    renderPlan();
    expect(
      await screen.findByText("Текущее покрытие требований"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Каталог навыков временно недоступен"),
    ).toBeInTheDocument();
    expect(screen.getByText(/План сохранён/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Обновить каталог" }));
    expect(catalogState.refetch).toHaveBeenCalledTimes(1);
  });

  it("hides profile context if the catalog reports expired access", async () => {
    vi.mocked(careerPlanApi.getPlan).mockResolvedValue(planFixture());
    catalogState.error = new ApiError("Forbidden catalog", 403);
    catalogState.isError = true;
    renderPlan();
    expect(await screen.findByText("Forbidden catalog")).toBeInTheDocument();
    await waitFor(() => expect(careerPlanApi.getPlan).toHaveBeenCalledOnce());
    expect(
      screen.queryByText("Текущее покрытие требований"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("completion-42")).not.toBeInTheDocument();
    expect(screen.queryByText("Advisor")).not.toBeInTheDocument();
  });

  it("allows an explicit retry when the first plan request fails", async () => {
    vi.mocked(careerPlanApi.getPlan)
      .mockRejectedValueOnce(new ApiError("Agent unavailable", 503))
      .mockResolvedValueOnce(planFixture());
    renderPlan();
    fireEvent.click(await screen.findByRole("button", { name: "Повторить" }));
    await waitFor(() =>
      expect(
        screen.getByText("Текущее покрытие требований"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("AI-сервис и карьерный план временно недоступны"),
    ).not.toBeInTheDocument();
  });
});
