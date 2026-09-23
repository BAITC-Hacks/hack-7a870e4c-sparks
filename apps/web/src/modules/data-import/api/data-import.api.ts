import {
  getCareerQuestAPI,
  type ImportDataBodyOne,
  type ImportDataResult,
} from "@/shared/api/generated";

const api = getCareerQuestAPI();

export type ImportPayload = ImportDataBodyOne;
export type ImportResult = ImportDataResult;

export const dataImportApi = {
  // An object is serialized by the shared axios client as JSON, never multipart.
  importData: (payload: ImportPayload): Promise<ImportResult> =>
    api.importData(payload),
};
