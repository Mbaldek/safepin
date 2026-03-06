import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface ToastNotif {
  id: string;
  type: string;
  message: string;
  subMessage?: string;
  variant: 'info' | 'success' | 'warning';
}

// ─── Toast builder ────────────────────────────────────────────────────────────

function buildToast(notif: AppNotification): Omit<ToastNotif, 'id'> {
  const p = notif.payload as Record<string, string>;

  switch (notif.type) {
    case 'circle_invitation':
      return {
        type: notif.type,
        message: 'Invitation cercle',
        subMessage: `${p.senderName ?? 'Quelqu\u2019un'} t\u2019invite dans son cercle`,
        variant: 'info',
      };
    case 'circle_accepted':
      return {
        type: notif.type,
        message: 'Cercle mis \u00e0 jour',
        subMessage: `${p.receiverName ?? 'Quelqu\u2019un'} a rejoint ton cercle \uD83C\uDF89`,
        variant: 'success',
      };
    default:
      return {
        type: notif.type,
        message: 'Notification',
        subMessage: undefined,
        variant: 'info',
      };
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface NotificationStore {
  notifications: AppNotification[];
  toastQueue: ToastNotif[];
  badgeCount: number;

  setNotifications: (notifs: AppNotification[]) => void;
  addNotification: (notif: AppNotification) => void;
  pushToast: (toast: Omit<ToastNotif, 'id'>) => void;
  dismissToast: (id: string) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

let toastCounter = 0;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  toastQueue: [],
  badgeCount: 0,

  setNotifications: (notifs) =>
    set({
      notifications: notifs,
      badgeCount: notifs.filter((n) => !n.read).length,
    }),

  addNotification: (notif) => {
    set((s) => {
      const notifications = [notif, ...s.notifications];
      return { notifications, badgeCount: notifications.filter((n) => !n.read).length };
    });
    // Auto-push toast
    get().pushToast(buildToast(notif));
  },

  pushToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const entry: ToastNotif = { ...toast, id };
    set((s) => ({ toastQueue: [...s.toastQueue, entry] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },

  dismissToast: (id) =>
    set((s) => ({ toastQueue: s.toastQueue.filter((t) => t.id !== id) })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      badgeCount: 0,
    })),

  markRead: (id) =>
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications, badgeCount: notifications.filter((n) => !n.read).length };
    }),
}));
