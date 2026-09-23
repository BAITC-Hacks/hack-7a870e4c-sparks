"use client";

import { ArrowRight, Check, ChevronRight, Clock3, Target } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type SkillGap = {
  name: string;
  current: number;
  required: number;
  critical?: boolean;
};

const skillGaps: SkillGap[] = [
  { name: "System Design", current: 2, required: 4, critical: true },
  { name: "Communication", current: 3, required: 4 },
  { name: "Mentoring", current: 1, required: 3 },
];

function LevelBar({
  current,
  required,
  tone = "blue",
}: {
  current: number;
  required: number;
  tone?: "blue" | "teal" | "amber";
}) {
  const width = `${Math.min(100, (current / required) * 100)}%`;
  const toneClass = {
    blue: "bg-[#008F73]",
    teal: "bg-[#008F73]",
    amber: "bg-[#F4C64E]",
  }[tone];

  return (
    <div
      className="h-1.5 w-full overflow-hidden bg-[#DCE7E1]"
      role="progressbar"
      aria-label={`${current} из ${required}`}
      aria-valuemin={0}
      aria-valuemax={required}
      aria-valuenow={current}
    >
      <div
        className={cn("h-full transition-all duration-700", toneClass)}
        style={{ width }}
      />
    </div>
  );
}

export function SkillGapCard({ skill }: { skill: SkillGap }) {
  return (
    <div className="border-t border-[#D8E2DC] py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#123C34]">{skill.name}</p>
          <p className="mt-1 text-xs text-[#6C7D75]">
            Текущий уровень / требуемый
          </p>
        </div>
        {skill.critical ? (
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#A47700]">
            Критичный
          </span>
        ) : null}
      </div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-[#008F73]">{skill.current}</span>
        <span className="text-[#6C7D75]">{skill.required}</span>
      </div>
      <LevelBar
        current={skill.current}
        required={skill.required}
        tone={skill.critical ? "amber" : "blue"}
      />
    </div>
  );
}

export function RecommendationCard() {
  const [completed, setCompleted] = useState(false);

  return (
    <section className="border-y border-[#BFD6CC] py-6 sm:py-7">
      <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        <div>
          <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#008F73]">
            <span className="h-2 w-2 bg-[#F4C64E]" />
            Следующий шаг
          </div>
          <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[#123C34] sm:text-3xl">
            System Design Workshop
          </h3>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#52675E]">
            Практический воркшоп для перехода с Middle на Senior Backend
            Engineer.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6C7D75]">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4 text-[#008F73]" /> 3 часа
            </span>
            <span>Online · 12 октября</span>
          </div>
        </div>
        <div className="border-[#D8E2DC] lg:border-l lg:pl-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6C7D75]">
            Почему этот шаг
          </p>
          <p className="mt-3 text-sm leading-6 text-[#52675E]">
            System Design — критичный навык для Senior. Сейчас уровень{" "}
            <strong className="font-semibold text-[#123C34]">2 из 4</strong>.
            Активность может повысить его на +1.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button
              onClick={() => setCompleted(true)}
              disabled={completed}
              className="rounded-none bg-[#123C34] px-5 text-white hover:bg-[#008F73]"
            >
              {completed ? (
                <>
                  <Check className="size-4" /> Прогресс обновлён
                </>
              ) : (
                <>
                  Начать активность <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#008F73] hover:text-[#123C34]"
            >
              Подробнее <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CareerTrajectory() {
  return (
    <section className="border-t border-[#D8E2DC] pt-5">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold text-[#123C34]">
          Карьерная траектория
        </h2>
        <span className="text-xs text-[#6C7D75]">Цель: Senior</span>
      </div>
      <div className="flex items-center gap-2">
        {[
          ["Junior", true],
          ["Middle", true],
          ["Senior", false],
          ["Lead", false],
        ].map(([label, done], index) => (
          <div
            className="flex min-w-0 flex-1 items-center gap-2"
            key={label as string}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center text-xs font-bold",
                done
                  ? "bg-[#DDF1E9] text-[#008F73]"
                  : index === 2
                    ? "bg-[#F4C64E] text-[#123C34]"
                    : "border border-[#C7D5CD] text-[#6C7D75]",
              )}
            >
              {done ? (
                <Check className="size-4" />
              ) : index === 2 ? (
                <Target className="size-4" />
              ) : (
                "—"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-xs font-semibold",
                  index === 2 ? "text-[#123C34]" : "text-[#6C7D75]",
                )}
              >
                {label as string}
              </p>
              {index < 3 ? (
                <div
                  className={cn(
                    "mt-2 h-px",
                    index < 2 ? "bg-[#008F73]" : "bg-[#D8E2DC]",
                  )}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HRMetrics() {
  const metrics = [
    ["Главный дефицит", "Leadership", "47 сотрудников"],
    ["Завершение активностей", "79%", "+8% за месяц"],
    ["Без следующего шага", "12", "нужна рекомендация"],
  ];

  return (
    <div className="grid border-y border-[#D8E2DC] md:grid-cols-3">
      {metrics.map(([label, value, detail], index) => (
        <div
          className={cn(
            "py-5 md:px-6",
            index > 0 && "border-t border-[#D8E2DC] md:border-l md:border-t-0",
          )}
          key={label}
        >
          <p className="text-sm text-[#6C7D75]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#123C34]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[#6C7D75]">{detail}</p>
        </div>
      ))}
    </div>
  );
}

export function CareerQuestShowcase() {
  return (
    <main className="min-h-screen bg-[#F7F5EE] p-4 text-[#123C34] sm:p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col justify-between gap-5 border-b border-[#C9D9D0] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-[#008F73]">
              Career Quest · Employee view
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#123C34] sm:text-4xl">
              Добрый день, Айдана
            </h1>
            <p className="mt-2 text-[#6C7D75]">
              Ваш следующий шаг к Senior Backend Engineer уже готов.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#52675E]">
            <span>Middle · 52 месяца</span>
            <div className="flex size-9 items-center justify-center bg-[#123C34] text-xs font-bold text-[#F4C64E]">
              АА
            </div>
          </div>
        </header>
        <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="border-t-4 border-[#F4C64E] pt-4">
            <p className="text-sm text-[#6C7D75]">Готовность к Senior</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-5xl font-semibold tracking-[-0.05em] text-[#123C34]">
                68%
              </span>
              <span className="mb-1 text-sm font-medium text-[#008F73]">
                +8% за месяц
              </span>
            </div>
            <div className="mt-6 h-1.5 overflow-hidden bg-[#DCE7E1]">
              <div className="h-full w-[68%] bg-[#008F73]" />
            </div>
            <p className="mt-4 text-sm text-[#6C7D75]">
              Осталось закрыть 3 критичных skill gaps
            </p>
          </div>
          <CareerTrajectory />
        </section>
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#123C34]">
                Ваш следующий шаг
              </h2>
              <p className="mt-1 text-sm text-[#6C7D75]">
                Рекомендация учитывает цель, разрывы и историю участия
              </p>
            </div>
            <button
              type="button"
              className="hidden text-sm font-medium text-[#008F73] sm:inline-flex sm:items-center sm:gap-1"
            >
              Все рекомендации <ArrowRight className="size-4" />
            </button>
          </div>
          <RecommendationCard />
        </section>
        <section>
          <div className="mb-2">
            <h2 className="text-xl font-semibold text-[#123C34]">
              Ключевые skill gaps
            </h2>
            <p className="mt-1 text-sm text-[#6C7D75]">
              Навыки, которые сильнее всего влияют на переход к Senior
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 md:gap-8">
            {skillGaps.map((skill) => (
              <SkillGapCard key={skill.name} skill={skill} />
            ))}
          </div>
        </section>
        <section>
          <div className="mb-2">
            <h2 className="text-xl font-semibold text-[#123C34]">
              HR snapshot
            </h2>
            <p className="mt-1 text-sm text-[#6C7D75]">
              Агрегированные метрики без персональных рейтингов
            </p>
          </div>
          <HRMetrics />
        </section>
      </div>
    </main>
  );
}
