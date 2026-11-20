import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200 shadow-xl p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-2xl font-display">
          404
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-2xl text-slate-900">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            The service page or worker listing you requested does not exist or may have been moved.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-sm transition-transform active:scale-95 text-center"
          >
            Find Local Workers
          </Link>
          <Link
            href="/#emergency"
            className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-sm rounded-xl border border-rose-200 text-center"
          >
            🚨 Emergency Dispatch
          </Link>
        </div>

        <p className="text-[11px] text-slate-400">
          KaamSetu Chhatrapati Sambhajinagar
        </p>
      </div>
    </div>
  );
}
