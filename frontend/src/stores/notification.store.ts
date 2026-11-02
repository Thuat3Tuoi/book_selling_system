import { create } from "zustand";

export type NotificationType = "success" | "error" | "info";

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

interface NotificationState {
  notifications: Notification[];
  add: (type: NotificationType, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  add: (type, message) => {
    const notification = { id: ++nextId, type, message };
    set((state) => ({
      notifications: [...state.notifications.slice(-2), notification],
    }));
  },
  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((item) => item.id !== id),
    })),
}));

export const notify = {
  success: (message: string) =>
    useNotificationStore.getState().add("success", message),
  error: (message: string) =>
    useNotificationStore.getState().add("error", message),
  info: (message: string) =>
    useNotificationStore.getState().add("info", message),
};
