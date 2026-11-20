'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('SWABHIMAN Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200 shadow-xl p-8 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-3xl">
          ⚠️
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-2xl text-slate-900">
            Something unexpected occurred
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            We encountered a temporary issue loading this section. Your bookings, favorites, and settings remain safe.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-mono text-left overflow-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-sm transition-transform active:scale-95"
          >
            🔄 Try Again
          </button>
          <a
            href="/"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors text-center"
          >
            Go to Home
          </a>
        </div>

        <p className="text-[11px] text-slate-400">
          SWABHIMAN Chhatrapati Sambhajinagar • Error Boundary Active
        </p>
      </div>
    </div>
  );
}
