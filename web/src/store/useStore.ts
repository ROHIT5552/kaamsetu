import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  user: any | null;
  setUser: (user: any | null) => void;

  compareIds: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  activeWorkerDialog: any | null;
  setActiveWorkerDialog: (worker: any | null) => void;

  activeBookingDialog: any | null;
  setActiveBookingDialog: (worker: any | null) => void;

  activeTrackBooking: any | null;
  setActiveTrackBooking: (booking: any | null) => void;

  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  theme: 'light',
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('kaamsetu_theme', theme);
    }
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(nextTheme);
  },

  authModalOpen: false,
  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  user: null,
  setUser: (user) => set({ user }),

  compareIds: [],
  toggleCompare: (id) => {
    const { compareIds, addToast } = get();
    if (compareIds.includes(id)) {
      set({ compareIds: compareIds.filter((item) => item !== id) });
    } else {
      if (compareIds.length >= 3) {
        addToast('You can compare up to 3 workers at a time.', 'info');
        return;
      }
      set({ compareIds: [...compareIds, id] });
    }
  },
  clearCompare: () => set({ compareIds: [] }),

  activeWorkerDialog: null,
  setActiveWorkerDialog: (worker) => set({ activeWorkerDialog: worker }),

  activeBookingDialog: null,
  setActiveBookingDialog: (worker) => set({ activeBookingDialog: worker }),

  activeTrackBooking: null,
  setActiveTrackBooking: (booking) => set({ activeTrackBooking: booking }),

  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
