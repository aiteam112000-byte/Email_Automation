import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await api.post("/api/auth/register", { name, email, password });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Something went wrong"); setLoading(false); }
    else navigate("/login?registered=1");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex w-[55%] flex-col justify-between p-12 relative overflow-hidden bg-indigo-600">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-500/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative flex items-center gap-2.5 z-10">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <span className="font-bold text-white text-xl tracking-tight">ReachX</span>
        </div>
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3.5 py-1.5 text-xs font-medium text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Free forever · No credit card
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">Start sending<br />smarter today.</h2>
          </div>
          <div className="space-y-3">
            {[{ icon: "✉️", title: "Campaign Engine", desc: "Create, send, and track email campaigns" }, { icon: "🔍", title: "Email Validation", desc: "SMTP-level checks before you send" }, { icon: "📊", title: "Smart Analytics", desc: "Opens, clicks, bounces — all in one place" }, { icon: "⚡", title: "Background Queue", desc: "Reliable delivery with Redis + BullMQ" }].map((f) => (
              <div key={f.title} className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-3">
                <span className="text-lg shrink-0">{f.icon}</span>
                <div><div className="text-xs font-semibold text-white">{f.title}</div><div className="text-xs text-indigo-200 mt-0.5">{f.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10"><p className="text-indigo-200 text-xs">© 2026 ReachX</p></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-slate-400 text-sm mt-1">Free forever. No credit card needed.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputCls} />
            </div>
            {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold shadow-sm transition-all">
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">Sign in</Link>
          </p>
          <div className="text-center">
            <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
