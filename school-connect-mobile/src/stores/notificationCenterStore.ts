import { create } from "zustand";

type NotificationCenterState = {
  lastViewedAt: number;
  markAllAsRead: () => void;
};

export const useNotificationCenterStore = create<NotificationCenterState>((set) => ({
  lastViewedAt: 0,
  markAllAsRead: () => set({ lastViewedAt: Date.now() }),
}));
