import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCustomMutation } from "@/shared/lib/client";

import { useUpdateUser } from "../use-update-user";

vi.mock("@/shared/api/generated", () => ({
  updateUser: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
  useCustomMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  })),
}));

describe("useUpdateUser — хук обновления пользователя", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("возвращает функции и состояние мутации", () => {
    const { result } = renderHook(() => useUpdateUser(1));

    expect(result.current).toHaveProperty("updateUser");
    expect(result.current).toHaveProperty("isUpdating");
    expect(result.current).toHaveProperty("updateError");
    expect(typeof result.current.updateUser).toBe("function");
    expect(typeof result.current.isUpdating).toBe("boolean");
  });

  it("вызывает updateUser с корректными данными", () => {
    const mockMutate = vi.fn();
    const mutationMock = {
      mutate: mockMutate,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useCustomMutation>;

    vi.mocked(useCustomMutation).mockReturnValue(mutationMock);

    const { result } = renderHook(() => useUpdateUser(1));

    const updateData = { name: "Updated Name", email: "updated@example.com" };
    result.current.updateUser(updateData);

    expect(mockMutate).toHaveBeenCalledWith(updateData);
  });

  it("возвращает состояние загрузки", () => {
    const mutationMock = {
      mutate: vi.fn(),
      isPending: true,
      error: null,
    } as unknown as ReturnType<typeof useCustomMutation>;

    vi.mocked(useCustomMutation).mockReturnValue(mutationMock);

    const { result } = renderHook(() => useUpdateUser(1));

    expect(result.current.isUpdating).toBe(true);
  });

  it("возвращает состояние ошибки", () => {
    const mockError = new Error("Update failed");
    const mutationMock = {
      mutate: vi.fn(),
      isPending: false,
      error: mockError,
    } as unknown as ReturnType<typeof useCustomMutation>;

    vi.mocked(useCustomMutation).mockReturnValue(mutationMock);

    const { result } = renderHook(() => useUpdateUser(1));

    expect(result.current.updateError).toBe(mockError);
  });
});
