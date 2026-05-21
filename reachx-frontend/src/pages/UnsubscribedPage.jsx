export default function UnsubscribedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full text-center shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">You've been unsubscribed</h1>
        <p className="text-slate-500 text-sm">You won't receive any more emails from this sender. If this was a mistake, please contact them directly.</p>
        <p className="text-xs text-slate-400">It may take up to 24 hours to take full effect.</p>
      </div>
    </div>
  );
}
