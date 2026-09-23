import axios, { type AxiosRequestConfig } from "axios";

import { axiosApi } from "./axios-client";

export class ApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiErrorStatus(error: unknown) {
  return error instanceof ApiError
    ? error.status
    : axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Произошла ошибка",
) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const message =
      typeof error.response?.data?.message === "string"
        ? error.response.data.message
        : error.message;
    return new ApiError(message, error.response?.status);
  }
  return error instanceof ApiError
    ? error
    : new ApiError(error instanceof Error ? error.message : "Произошла ошибка");
}

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return axiosApi(config)
    .then(({ data }) => data as T)
    .catch((error: unknown) => Promise.reject(normalizeError(error)));
};

export default customInstance;
