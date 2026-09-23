"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Progress } from "@/shared/components/ui/progress";

import {
  type ActivityCompletion,
  mapCompletionToView,
} from "../model/mappers/completion.mapper";
import { ProgressSuccess } from "./ProgressSuccess";

function percentage(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`;
}

export function ActivityResult({
  completion,
  asOfDate,
  skillNames,
}: {
  completion: ActivityCompletion;
  asOfDate: string;
  skillNames: Map<string, string>;
}) {
  const t = useTranslations("activities");
  const result = mapCompletionToView(completion, asOfDate);
  const [progress, setProgress] = useState(result.readinessBefore);
  const toastMessage = t(
    result.alreadyCompleted ? "alreadyCompletedNote" : "updated",
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setProgress(result.readinessAfter),
    );
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 600;
    const timer = window.setTimeout(() => toast.success(toastMessage), delay);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [result.readinessAfter, toastMessage]);

  return (
    <section
      aria-label={t("result")}
      aria-live="polite"
      className="flex flex-col gap-5"
    >
      <Alert className="flex items-center gap-3">
        {result.alreadyCompleted ? (
          <CheckCircle2 aria-hidden="true" className="shrink-0" />
        ) : (
          <ProgressSuccess />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <AlertTitle className="line-clamp-none">
            <h2>
              {t(result.alreadyCompleted ? "alreadyCompleted" : "completed")}
            </h2>
          </AlertTitle>
          <AlertDescription>
            <span>
              {t(
                result.alreadyCompleted ? "alreadyCompletedNote" : "resultNote",
              )}
            </span>
          </AlertDescription>
        </div>
      </Alert>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">{t("readiness")}</h3>
        <p className="text-2xl font-semibold tabular-nums">
          {result.comparisonAvailable && (
            <>{percentage(result.readinessBefore)} → </>
          )}
          {percentage(result.readinessAfter)}
        </p>
        {result.readinessAfter !== null && (
          <Progress value={progress} aria-label={t("readiness")} />
        )}
        <p className="text-sm text-muted-foreground">{t("readinessNote")}</p>
      </div>
      {!result.comparisonAvailable ? (
        <p className="text-sm">{t("noComparison")}</p>
      ) : result.changedSkills.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {result.changedSkills.map((skill) => (
            <li
              key={skill.id}
              className="activity-skill-change flex flex-wrap justify-between gap-3 rounded-md p-2 text-sm"
            >
              <span>{skillNames.get(skill.id) ?? skill.name}</span>
              <span className="font-semibold tabular-nums">
                {skill.before} → {skill.after}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noSkillChange")}</p>
      )}
      {!result.alreadyCompleted && result.comparisonAvailable && (
        <p className="text-sm">
          {t("closedGaps", { count: result.closedGaps.length })}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {t("asOf", { date: result.asOfDate })}
      </p>
      {completion.profile.warnings.length > 0 && (
        <Alert>
          <AlertTitle>{t("warnings")}</AlertTitle>
          <AlertDescription>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {completion.profile.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}
