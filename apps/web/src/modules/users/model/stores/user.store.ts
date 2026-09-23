import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UserUiState {
  // Эфемерное UI-состояние (не дублирует серверный кэш)
  selectedUserId: number | null;
  isEditModalOpen: boolean;
  isCreateModalOpen: boolean;

  // Действия для управления UI
  setSelectedUserId: (id: number | null) => void;
  setEditModalOpen: (open: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;

  // Удобные хелперы
  openEditModal: (userId: number) => void;
  closeEditModal: () => void;
  reset: () => void;
}

const initialState = {
  selectedUserId: null,
  isEditModalOpen: false,
  isCreateModalOpen: false,
};

/**
 * Клиентское UI-состояние модуля Users.
 *
 * ВАЖНО: Храните здесь только эфемерное состояние интерфейса (открытие модалок,
 * выбранные ID для отображения деталей и т.д.).
 *
 * НЕ дублируйте здесь данные с сервера (списки пользователей, профиль текущего юзера) —
 * для этого используется кэш React Query / RSC.
 */
export const useUserStore = create<UserUiState>()(
  devtools(
    (set) => ({
      ...initialState,

      setSelectedUserId: (id) => set({ selectedUserId: id }),

      setEditModalOpen: (open) => set({ isEditModalOpen: open }),

      setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),

      openEditModal: (userId) =>
        set({
          selectedUserId: userId,
          isEditModalOpen: true,
        }),

      closeEditModal: () =>
        set({
          selectedUserId: null,
          isEditModalOpen: false,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "user-ui-store",
    },
  ),
);
