'use client';

import React from 'react';
import { ToastNotification, ToastType } from '../utils/types';

interface ToasterProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

const toastTypeStyles: Record<ToastType, { badge: string; icon: string; border: string }> = {
  success: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: '✓',
    border: 'border-emerald-200',
  },
  info: {
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: '⚡',
    border: 'border-amber-200',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: '⚠️',
    border: 'border-amber-300',
  },
  error: {
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: '✕',
    border: 'border-rose-200',
  },
};

export default function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const type: ToastType = toast.type || 'info';
        const style = toastTypeStyles[type] || toastTypeStyles.info;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl border ${style.border} shadow-xl p-3.5 sm:p-4 flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4`}
          >
            <span
              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${style.badge}`}
            >
              {style.icon}
            </span>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <div className="font-display font-bold text-xs text-slate-900 tracking-tight">
                  {toast.title}
                </div>
              )}
              <div className="text-xs text-slate-600 font-medium leading-relaxed">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors text-sm shrink-0"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
