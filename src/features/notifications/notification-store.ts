import { create } from 'zustand';

import type { Notification } from '@/types';
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/lib/supabase-notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;

  fetchNotifications: (userId: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  setOpen: (open: boolean) => void;
  subscribeRealtime: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isOpen: false,

  fetchNotifications: async (userId) => {
    set({ isLoading: true });
    try {
      const data = await fetchNotifications(userId);
      const unreadCount = data.filter((n) => !n.read).length;
      set({ notifications: data, unreadCount });
    } finally {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    await markNotificationRead(id);
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    });
  },

  markAllRead: async (userId) => {
    await markAllNotificationsRead(userId);
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  deleteNotification: async (id) => {
    await deleteNotification(id);
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    });
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    }));
  },

  setOpen: (open) => set({ isOpen: open }),

  subscribeRealtime: (userId) => {
    const channel = subscribeToNotifications(userId, (notification) => {
      get().addNotification(notification);
    });
    return () => {
      channel.unsubscribe();
    };
  },
}));

export const useUnreadCount = () =>
  useNotificationStore((s) => s.unreadCount);

export const useNotifications = () =>
  useNotificationStore((s) => s.notifications);

export const useNotificationOpen = () =>
  useNotificationStore((s) => s.isOpen);
