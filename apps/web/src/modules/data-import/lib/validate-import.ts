import type { ImportPayload } from "../api/data-import.api";
import type { DataImportMessages } from "../model/data-import.messages";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
export const HISTORY_COLUMNS = [
  "record_id",
  "employee_id",
  "event_id",
  "date",
  "due_date",
  "status",
  "completion_pct",
  "score",
  "feedback_rating",
  "assigned_by",
] as const;
export type ImportFileKind = "employees" | "history";
export type FileErrorCode = keyof DataImportMessages["fileErrors"];
export type FilePreview = { count: number; sample: string[]; empty: boolean };

export class ImportFileError extends Error {
  constructor(
    readonly code: FileErrorCode,
    readonly row?: number,
  ) {
    super(code);
  }
}

export function payloadSize(payload: ImportPayload) {
  const encoder = new TextEncoder();
  return {
    content:
      encoder.encode(payload.employees_json).length +
      encoder.encode(payload.history_csv).length,
    request: encoder.encode(JSON.stringify(payload)).length,
  };
}

function employeePreview(text: string): FilePreview {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ImportFileError("json");
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("employees" in value) ||
    !Array.isArray(value.employees)
  ) {
    throw new ImportFileError("employees");
  }
  const identifiers = new Set<string>();
  const sample: string[] = [];
  for (const employee of value.employees) {
    if (
      !employee ||
      typeof employee !== "object" ||
      Array.isArray(employee) ||
      typeof employee.employee_id !== "string" ||
      !employee.employee_id.trim()
    ) {
      throw new ImportFileError("employees");
    }
    if (identifiers.has(employee.employee_id))
      throw new ImportFileError("duplicate");
    identifiers.add(employee.employee_id);
    if (sample.length < 3)
      sample.push(
        [employee.employee_id, employee.full_name]
          .filter((part) => typeof part === "string")
          .join(" · "),
      );
  }
  return { count: value.employees.length, sample, empty: false };
}

// A structural CSV scan handles quoted commas/newlines without interpreting
// business fields. Only three preview labels are retained for large files.
function historyPreview(source: string): FilePreview {
  const text = source.replace(/^\uFEFF/, "");
  let header: string[] | undefined;
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;
  let started = false;
  let line = 1;
  let count = 0;
  const sample: string[] = [];
  function finishRow() {
    if (!started && row.length === 0 && cell === "") return;
    row.push(cell);
    if (!header) {
      if (
        new Set(row).size !== row.length ||
        !HISTORY_COLUMNS.every((name) => row.includes(name)) ||
        !row.every((name) =>
          [...HISTORY_COLUMNS, "completed_at"].includes(name),
        )
      ) {
        throw new ImportFileError("header", line);
      }
      header = row;
    } else {
      if (row.length !== header.length) throw new ImportFileError("csv", line);
      count += 1;
      if (sample.length < 3)
        sample.push(
          ["record_id", "employee_id", "event_id"]
            .map((name) => row[header?.indexOf(name) ?? -1])
            .join(" · "),
        );
    }
    row = [];
    cell = "";
    started = false;
    closedQuote = false;
  }
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        cell += char;
        if (char === "\n") line += 1;
      }
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      closedQuote = false;
      started = true;
    } else if (char === "\n" || char === "\r") {
      finishRow();
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      line += 1;
    } else if (char === '"' && !cell && !closedQuote) {
      quoted = true;
      started = true;
    } else {
      if (closedQuote || char === '"') throw new ImportFileError("csv", line);
      cell += char;
      started = true;
    }
  }
  if (quoted) throw new ImportFileError("csv", line);
  finishRow();
  if (!header) throw new ImportFileError("header");
  return { count, sample, empty: false };
}

export function previewFile(kind: ImportFileKind, text: string): FilePreview {
  if (!text.trim()) return { count: 0, sample: [], empty: true };
  return kind === "employees" ? employeePreview(text) : historyPreview(text);
}
