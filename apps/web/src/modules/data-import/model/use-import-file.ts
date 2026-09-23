"use client";

import { useEffect, useRef, useState } from "react";

import {
  type FilePreview,
  ImportFileError,
  type ImportFileKind,
  MAX_IMPORT_BYTES,
  previewFile,
} from "../lib/validate-import";

export type ImportFileState = {
  name: string;
  size: number;
  reading: boolean;
  text?: string;
  preview?: FilePreview;
  error?: ImportFileError;
};

export function useImportFile(kind: ImportFileKind) {
  const [file, setFile] = useState<ImportFileState | null>(null);
  const generation = useRef(0);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  function remove() {
    generation.current += 1;
    setFile(null);
  }

  async function choose(files: FileList | File[]) {
    if (!files.length) return;
    const current = ++generation.current;
    const selected = files[0];
    const initial = {
      name: selected.name,
      size: selected.size,
      reading: false,
    };
    if (files.length !== 1) {
      setFile({ ...initial, error: new ImportFileError("single") });
      return;
    }
    const extension = kind === "employees" ? ".json" : ".csv";
    if (!selected.name.toLowerCase().endsWith(extension)) {
      setFile({ ...initial, error: new ImportFileError("extension") });
      return;
    }
    if (selected.size > MAX_IMPORT_BYTES) {
      setFile({ ...initial, error: new ImportFileError("size") });
      return;
    }
    setFile({ ...initial, reading: true });
    try {
      const bytes = await selected.arrayBuffer();
      if (current !== generation.current) return;
      let text: string;
      try {
        // Preserve BOM: JSON and CSV intentionally have different backend rules.
        text = new TextDecoder("utf-8", {
          fatal: true,
          ignoreBOM: true,
        }).decode(bytes);
      } catch {
        throw new ImportFileError("encoding");
      }
      const preview = previewFile(kind, text);
      if (current !== generation.current) return;
      setFile({ ...initial, text, preview });
    } catch (error) {
      if (current !== generation.current) return;
      setFile({
        ...initial,
        error:
          error instanceof ImportFileError
            ? error
            : new ImportFileError("read"),
      });
    }
  }

  return { file, choose, remove };
}
