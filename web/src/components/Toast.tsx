'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            role="alert"
            aria-live="assertive"
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border border-line bg-card text-ink transition-all animate-in fade-in slide-in-from-top-2"
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-ok shrink-0 mt-0.5" />}
            {isError && <AlertCircle className="w-5 h-5 text-bad shrink-0 mt-0.5" />}
            {!isSuccess && !isError && <Info className="w-5 h-5 text-blue shrink-0 mt-0.5" />}

            <div className="text-sm font-medium flex-1 leading-snug">{toast.message}</div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-mute hover:text-ink shrink-0 p-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
