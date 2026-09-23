"use client";

import { Check, FileUp, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/shared/components/ui";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/lib/utils";

import type { ImportFileKind } from "../lib/validate-import";
import type { DataImportMessages } from "../model/data-import.messages";
import type { ImportFileState } from "../model/use-import-file";

type Props = {
  kind: ImportFileKind;
  file: ImportFileState | null;
  disabled: boolean;
  messages: DataImportMessages;
  onChoose: (files: FileList | File[]) => void;
  onRemove: () => void;
};

export function ImportFileInput({
  kind,
  file,
  disabled,
  messages,
  onChoose,
  onRemove,
}: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const title = messages[kind];
  const extension = kind === "employees" ? ".json" : ".csv";

  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-4">
      <div className="space-y-1.5">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}{" "}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {extension.toUpperCase()}
          </span>
        </h2>
        <p
          id={`${id}-help`}
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {messages[kind === "employees" ? "employeesFormat" : "historyFormat"]}
        </p>
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={extension}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-label={title}
        onChange={(event) => {
          if (event.currentTarget.files) onChoose(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        aria-describedby={`${id}-help`}
        aria-label={`${file ? messages.replace : messages.choose}: ${title}`}
        className={cn(
          "flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-card px-5 py-6 text-center transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none",
          dragging && "border-primary bg-muted",
          file?.error && "border-destructive",
        )}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) onChoose(event.dataTransfer.files);
        }}
      >
        <FileUp
          aria-hidden="true"
          className="mb-1 size-6 text-muted-foreground"
        />
        <span className="font-medium">
          {file ? messages.replace : messages.choose}
        </span>
        <span className="text-xs text-muted-foreground">{messages.drop}</span>
      </button>
      {file && (
        <div className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-all font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} {messages.mib}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={`${messages.remove}: ${file.name}`}
              onClick={onRemove}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
          {file.reading && (
            <p
              role="status"
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Spinner
                aria-hidden="true"
                className="motion-reduce:animate-none"
              />
              {messages.reading}
            </p>
          )}
          {file.error && (
            <p role="alert" className="break-words text-destructive">
              {messages.fileErrors[file.error.code]}
              {file.error.row ? ` (${messages.row}: ${file.error.row})` : ""}
            </p>
          )}
          {file.preview && (
            <div role="status" className="space-y-2">
              <p className="flex items-center gap-2">
                <Check aria-hidden="true" className="size-4 text-primary" />
                {file.preview.empty
                  ? messages.empty
                  : `${messages.records}: ${file.preview.count}`}
              </p>
              {file.preview.sample.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {messages.sample}
                  </p>
                  <p className="whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground">
                    {file.preview.sample.join("\n")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
