"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Upload } from "lucide-react";
import { useLocale } from "next-intl";
import { useMemo } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
} from "@/shared/components/ui";
import { Spinner } from "@/shared/components/ui/spinner";
import { Link } from "@/shared/configs/i18/navigation";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";

import {
  HISTORY_COLUMNS,
  MAX_IMPORT_BYTES,
  payloadSize,
} from "../lib/validate-import";
import { dataImportMessages } from "../model/data-import.messages";
import { useImportData } from "../model/mutations/use-import-data";
import { useImportFile } from "../model/use-import-file";
import { ImportFileInput } from "./ImportFileInput";

export function DataImportView() {
  const locale = useLocale();
  const messages = dataImportMessages[locale === "kk" ? "kk" : "ru"];
  const employees = useImportFile("employees");
  const history = useImportFile("history");
  const mutation = useImportData();
  const payload = useMemo(
    () => ({
      employees_json: employees.file?.text ?? "",
      history_csv: history.file?.text ?? "",
    }),
    [employees.file?.text, history.file?.text],
  );
  const size = useMemo(() => payloadSize(payload), [payload]);
  const oversized =
    size.content > MAX_IMPORT_BYTES || size.request > MAX_IMPORT_BYTES;
  const reading = employees.file?.reading || history.file?.reading;
  const invalid = employees.file?.error || history.file?.error;
  const hasContent = Boolean(
    payload.employees_json.trim() || payload.history_csv.trim(),
  );
  const disabled = mutation.isPending || !mutation.canImport;
  const status = getApiErrorStatus(mutation.error);
  const result =
    mutation.isSuccess && mutation.canImport ? mutation.data : null;

  if (result)
    return (
      <section
        aria-labelledby="import-success-title"
        className="max-w-3xl space-y-7 rounded-md border bg-card p-6 sm:p-8"
      >
        <div role="status" className="space-y-3">
          <CheckCircle2 aria-hidden="true" className="size-9 text-primary" />
          <h2 id="import-success-title" className="text-2xl font-semibold">
            {messages.success}
          </h2>
          <p className="text-sm text-muted-foreground">{result.message}</p>
        </div>
        <dl className="grid grid-cols-1 gap-6 border-y py-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">
              {messages.acceptedEmployees}
            </dt>
            <dd className="mt-2 text-4xl font-semibold tabular-nums">
              {result.employees}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {messages.acceptedHistory}
            </dt>
            <dd className="mt-2 text-4xl font-semibold tabular-nums">
              {result.history}
            </dd>
          </div>
        </dl>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {messages.successNote}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/hr">
              {messages.openHr}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              employees.remove();
              history.remove();
              mutation.reset();
            }}
          >
            {messages.again}
          </Button>
        </div>
      </section>
    );

  return (
    <div className="max-w-5xl space-y-8">
      <header className="max-w-3xl space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {messages.heading}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {messages.description}
        </p>
        <p className="text-sm leading-relaxed">{messages.synthetic}</p>
      </header>
      <form
        className="space-y-8"
        aria-busy={mutation.isPending || Boolean(reading)}
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !reading && !invalid && !oversized && hasContent)
            mutation.mutate(payload);
        }}
      >
        <div className="grid gap-8 border-y py-8 md:grid-cols-2">
          <ImportFileInput
            kind="employees"
            file={employees.file}
            disabled={disabled}
            messages={messages}
            onChoose={(files) => {
              mutation.reset();
              void employees.choose(files);
            }}
            onRemove={() => {
              mutation.reset();
              employees.remove();
            }}
          />
          <ImportFileInput
            kind="history"
            file={history.file}
            disabled={disabled}
            messages={messages}
            onChoose={(files) => {
              mutation.reset();
              void history.choose(files);
            }}
            onRemove={() => {
              mutation.reset();
              history.remove();
            }}
          />
        </div>
        <details className="text-sm">
          <summary className="w-fit cursor-pointer rounded-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">
            {messages.columns}
          </summary>
          <p className="mt-3 break-words font-mono text-xs leading-relaxed text-muted-foreground">
            {HISTORY_COLUMNS.join(", ")}
            <br />
            completed_at ({messages.optional})
          </p>
        </details>
        {(employees.file || history.file) && (
          <section aria-labelledby="import-preview-title" className="space-y-3">
            <h3 id="import-preview-title" className="font-semibold">
              {messages.preview}
            </h3>
            <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{messages.bytes}:</dt>
                <dd className="tabular-nums">
                  {(size.content / 1024 / 1024).toFixed(2)} {messages.mib}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">
                  {messages.requestBytes}:
                </dt>
                <dd className="tabular-nums">
                  {(size.request / 1024 / 1024).toFixed(2)} {messages.mib}
                </dd>
              </div>
            </dl>
            {!reading && !invalid && hasContent && !oversized && (
              <p className="text-sm text-muted-foreground">
                {messages.serverValidation}
              </p>
            )}
            {oversized && (
              <p role="alert" className="text-sm text-destructive">
                {messages.sizeError}
              </p>
            )}
          </section>
        )}
        {mutation.isError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle className="line-clamp-none">
              {status === 403
                ? messages.accessDenied
                : status === 400
                  ? messages.invalidRequest
                  : messages.error}
            </AlertTitle>
            <AlertDescription>
              <p className="break-words">
                {status === 413
                  ? messages.sizeError
                  : getApiErrorMessage(mutation.error, messages.error)}
              </p>
              <p>
                {status && status >= 400 && status < 500
                  ? messages.rejected
                  : messages.uncertain}
              </p>
              {(!status || status >= 500) && (
                <Link href="/hr" className="underline underline-offset-4">
                  {messages.openHr}
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-4 border-t pt-6">
          <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>{messages.atomic}</p>
            <p>{messages.accounts}</p>
            <p>{messages.limit}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              disabled={
                disabled ||
                Boolean(reading) ||
                Boolean(invalid) ||
                oversized ||
                !hasContent
              }
            >
              {mutation.isPending ? (
                <Spinner
                  aria-hidden="true"
                  className="motion-reduce:animate-none"
                />
              ) : (
                <Upload aria-hidden="true" />
              )}
              {mutation.isPending ? messages.importing : messages.import}
            </Button>
            {!hasContent && !reading && !invalid && (
              <p className="text-sm text-muted-foreground">
                {messages.chooseFirst}
              </p>
            )}
          </div>
          {mutation.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              {messages.importing}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
