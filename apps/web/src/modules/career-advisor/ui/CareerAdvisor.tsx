"use client";

import { MessageCircle, RotateCcw, Send } from "lucide-react";
import { useLocale } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
} from "@/shared/components/ui";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";
import {
  ADVISOR_HISTORY_LIMIT,
  ADVISOR_MESSAGE_LIMIT,
  type AdvisorMessage,
  AdvisorValidationError,
} from "../api/career-advisor.api";
import { careerAdvisorMessages } from "../model/career-advisor.messages";
import { useCareerAdvisor } from "../model/mutations/use-career-advisor";

type ConversationMessage = AdvisorMessage & { id: number };

export function CareerAdvisor({ employeeId }: { employeeId: string }) {
  return <AdvisorConversation key={employeeId} employeeId={employeeId} />;
}

function AdvisorConversation({ employeeId }: { employeeId: string }) {
  const locale = useLocale();
  const t = careerAdvisorMessages[locale === "kk" ? "kk" : "ru"];
  const inputId = useId();
  const hintId = useId();
  const advisor = useCareerAdvisor(employeeId);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const trimmed = message.trim();
  const messageValid =
    trimmed.length > 0 && trimmed.length <= ADVISOR_MESSAGE_LIMIT;
  const unavailable = getApiErrorStatus(advisor.error) === 503;
  const validationError =
    advisor.error instanceof AdvisorValidationError ? advisor.error : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageValid || advisor.isPending) return;

    advisor.mutate(
      {
        message: trimmed,
        conversation_history: conversation
          .slice(-ADVISOR_HISTORY_LIMIT)
          .map(({ role, content }) => ({
            role,
            // API replies can be longer than the request's per-message limit.
            content: content.slice(0, ADVISOR_MESSAGE_LIMIT),
          })),
      },
      {
        onSuccess: ({ reply }) => {
          setConversation((previous) => [
            ...previous,
            { id: previous.length, role: "user", content: trimmed },
            { id: previous.length + 1, role: "assistant", content: reply },
          ]);
          setMessage("");
        },
      },
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle aria-hidden="true" className="size-5" />
          <h2>{t.title}</h2>
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {conversation.length > 0 ? (
          <div
            role="log"
            aria-label={t.conversation}
            aria-live="polite"
            className="max-h-[28rem] space-y-5 overflow-y-auto rounded-md border p-4 sm:p-5"
          >
            {conversation.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  {item.role === "user" ? t.user : t.assistant}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t.empty}
          </p>
        )}

        {advisor.data && (
          <div className="space-y-2 text-sm" role="status">
            <Badge variant="outline">
              {advisor.data.recommendations.mode === "ai"
                ? t.aiMode
                : t.rulesMode}
            </Badge>
            {advisor.data.recommendations.mode === "ai" &&
              advisor.data.recommendations.model && (
                <p className="text-xs text-muted-foreground">
                  {advisor.data.recommendations.model}
                </p>
              )}
            <p className="text-muted-foreground">
              {advisor.data.recommendations.message}
            </p>
          </div>
        )}

        <form
          onSubmit={submit}
          className="space-y-4"
          aria-busy={advisor.isPending}
        >
          <div className="space-y-2">
            <Label htmlFor={inputId}>{t.messageLabel}</Label>
            <Textarea
              id={inputId}
              value={message}
              rows={3}
              maxLength={ADVISOR_MESSAGE_LIMIT}
              disabled={advisor.isPending}
              aria-describedby={hintId}
              placeholder={t.placeholder}
              onChange={(event) => {
                setMessage(event.target.value);
                if (advisor.isError) advisor.reset();
              }}
              className="resize-y"
            />
            <div
              id={hintId}
              className="flex items-start justify-between gap-4 text-xs leading-5 text-muted-foreground"
            >
              <p>{t.historyHint}</p>
              <span className="shrink-0 tabular-nums">
                {message.length} / {ADVISOR_MESSAGE_LIMIT}
              </span>
            </div>
          </div>

          {advisor.isError && (
            <Alert variant="destructive">
              <AlertTitle>{unavailable ? t.unavailable : t.error}</AlertTitle>
              <AlertDescription>
                <p>
                  {unavailable
                    ? t.unavailableHint
                    : validationError
                      ? validationError.field === "message"
                        ? t.messageInvalid
                        : t.historyInvalid
                      : t.errorHint}
                </p>
                {!unavailable && !validationError && (
                  <p>{getApiErrorMessage(advisor.error, t.errorHint)}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="outline"
              disabled={!messageValid || advisor.isPending}
            >
              {advisor.isPending ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <Send aria-hidden="true" data-icon="inline-start" />
              )}
              {advisor.isPending
                ? t.sending
                : advisor.isError
                  ? t.retry
                  : t.send}
            </Button>
            {conversation.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                disabled={advisor.isPending}
                onClick={() => {
                  setConversation([]);
                  setMessage("");
                  advisor.reset();
                }}
              >
                <RotateCcw aria-hidden="true" data-icon="inline-start" />
                {t.reset}
              </Button>
            )}
          </div>
          {advisor.isSuccess && (
            <p
              className="text-xs leading-5 text-muted-foreground"
              role="status"
            >
              {t.updated}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
