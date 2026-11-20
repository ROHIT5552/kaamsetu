'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="bg-[#faf9f5] text-slate-900 font-sans min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200 shadow-xl p-8 text-center space-y-4">
          <div className="text-4xl">⚡</div>
          <h1 className="text-2xl font-bold text-slate-900">System Recovery</h1>
          <p className="text-sm text-slate-600">
            A critical interface error was intercepted by the SWABHIMAN global safety boundary.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md"
          >
            Restart Application
          </button>
        </div>
      </body>
    </html>
  );
}
