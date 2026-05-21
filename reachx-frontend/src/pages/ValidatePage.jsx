import { useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const STATUS_CONFIG = {
  VALID:   { label: "Deliverable",   dot: "bg-emerald-400", text: "text-emerald-600", ring: "border-emerald-200 bg-emerald-50" },
  RISKY:   { label: "Risky",         dot: "bg-amber-400",   text: "text-amber-600",   ring: "border-amber-200 bg-amber-50" },
  INVALID: { label: "Undeliverable", dot: "bg-rose-400",    text: "text-rose-600",    ring: "border-rose-200 bg-rose-50" },
};

export default function ValidatePage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const parsedEmails = input.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);

  async function handleValidate() {
    if (!parsedEmails.length) return;
    setLoading(true);
    const res = await fetch(`${API}/api/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: parsedEmails }) });
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  }

  const counts = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">ReachX</span>
          </Link>
          <Link to="/dashboard" className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">Dashboard →</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-12 px-6 space-y-7">
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">Tools</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Validation</h1>
          <p className="text-slate-400 text-sm mt-1.5 max-w-lg">Paste emails below — each one is checked for format, MX records, and mailbox existence.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email addresses</label>
            <p className="text-xs text-slate-400">One per line or comma-separated</p>
            <textarea rows={7} value={input} onChange={(e) => setInput(e.target.value)} placeholder={"john@example.com\njane@company.com\ntest@mailinator.com"}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none transition-all" />
            {parsedEmails.length > 0 && <p className="text-xs font-medium text-indigo-600">{parsedEmails.length} email{parsedEmails.length !== 1 ? "s" : ""} detected</p>}
          </div>
          <button onClick={handleValidate} disabled={loading || !parsedEmails.length}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all">
            {loading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Validating...</> : "Validate Emails →"}
          </button>
        </div>

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {(["VALID", "RISKY", "INVALID"]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const count = counts[s] ?? 0;
                const pct = results.length > 0 ? ((count / results.length) * 100).toFixed(0) : "0";
                return (
                  <div key={s} className={`border rounded-2xl p-5 ${cfg.ring}`}>
                    <div className="flex items-center gap-2 mb-3"><span className={`w-2 h-2 rounded-full ${cfg.dot}`} /><span className={`text-[11px] font-semibold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span></div>
                    <div className={`text-3xl font-bold ${cfg.text}`}>{count}</div>
                    <div className="text-xs text-slate-400 mt-1">{pct}% of total</div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50"><h2 className="text-sm font-semibold text-slate-700">{results.length} results</h2></div>
              <div className="divide-y divide-slate-100">
                {results.map((r) => {
                  const cfg = STATUS_CONFIG[r.status];
                  return (
                    <div key={r.email} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                      <span className="font-mono text-sm text-slate-700">{r.email}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">{r.reason}</span>
                        <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 ${cfg.ring}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /><span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
