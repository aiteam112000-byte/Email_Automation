import { useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <span className="font-bold text-slate-900 text-xl tracking-tight">ReachX</span>
    </div>
  );
}

const STATUS_CFG = {
  VALID:   { label: "Deliverable",   dot: "bg-emerald-400", text: "text-emerald-600", ring: "border-emerald-200 bg-emerald-50" },
  RISKY:   { label: "Risky",         dot: "bg-amber-400",   text: "text-amber-600",   ring: "border-amber-200 bg-amber-50" },
  INVALID: { label: "Undeliverable", dot: "bg-rose-400",    text: "text-rose-600",    ring: "border-rose-200 bg-rose-50" },
};

const FEATURES = [
  { tag: "Core",        title: "Campaign Engine",  desc: "Create campaigns, upload contacts, and send via SMTP. Full delivery pipeline with bounce handling and retry logic.", color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-100" },
  { tag: "Unique",      title: "Email Validation", desc: "Validate emails in bulk — format checks, MX record lookups, and mailbox existence. Know before you send.",           color: "text-violet-600",  bg: "bg-violet-50 border-violet-100" },
  { tag: "Insights",    title: "Smart Analytics",  desc: "Track opens, clicks, bounces, and spam reports per campaign. Understand why results happen, not just what they are.", color: "text-sky-600",     bg: "bg-sky-50 border-sky-100" },
  { tag: "Management",  title: "Contact Manager",  desc: "Import contacts via CSV, tag and segment them, and manage your entire list from one clean interface.",                color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  { tag: "Reliability", title: "Background Queue", desc: "Emails are sent via BullMQ workers with Redis — non-blocking, with 3 retries and exponential backoff built in.",     color: "text-amber-600",   bg: "bg-amber-50 border-amber-100" },
  { tag: "Security",    title: "Auth & Sessions",  desc: "Secure credential-based auth with JWT. Each user's campaigns and contacts are fully isolated.",                      color: "text-rose-600",    bg: "bg-rose-50 border-rose-100" },
];

function ValidatorWidget() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleValidate() {
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await fetch(`${API}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: [email.trim()] }),
    });
    const data = await res.json();
    setResult(data.results?.[0] ?? null);
    setLoading(false);
  }

  return (
    <section id="demo" className="py-24 px-6 border-t border-slate-100 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Live demo</p>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">Verify any email<br />right now — free.</h2>
            <p className="text-slate-500 leading-relaxed text-sm">No signup needed. Paste an email address and see exactly what ReachX checks: format, MX records, and mailbox existence.</p>
            <ul className="space-y-3">
              {["Format & syntax validation", "MX record lookup", "Mailbox existence check", "Disposable email detection"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400" /><div className="w-3 h-3 rounded-full bg-amber-400" /><div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-slate-400 font-mono">reachx — email validator</span>
            </div>
            <div>
              <p className="text-slate-900 font-semibold">Verify an email instantly</p>
              <p className="text-sm text-slate-400 mt-1">Paste any address and hit verify.</p>
            </div>
            <div className="flex gap-2">
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
              <button onClick={handleValidate} disabled={loading || !email.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap">
                {loading ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : "Verify →"}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Try:</span>
              {["test@gmail.com", "fake@notreal.xyz", "info@mailinator.com"].map((ex) => (
                <button key={ex} onClick={() => setEmail(ex)} className="text-xs text-slate-500 hover:text-indigo-600 font-mono border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 rounded-md px-2 py-1 transition-all">{ex}</button>
              ))}
            </div>
            {result && (() => {
              const cfg = STATUS_CFG[result.status];
              return (
                <div className={`rounded-xl border p-4 space-y-3 ${cfg.ring}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Result</span>
                    <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${cfg.dot}`} /><span className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</span></div>
                  </div>
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Email</span><span className="font-mono text-slate-700">{email}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Detail</span><span className="text-slate-600">{result.reason}</span></div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#demo" className="hover:text-slate-900 transition-colors">Validator</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">Sign in</Link>
            <Link to="/register"><button className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-sm">Get started free</button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden bg-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-100 rounded-full blur-[120px] opacity-60 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-xs font-medium text-indigo-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />Email intelligence for modern teams
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-slate-900 mb-6">
            Send smarter emails.<br /><span className="text-indigo-600">Understand every send.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            ReachX gives you a full email campaign engine with real-time validation, delivery tracking, and deep analytics — so you always know what's happening inside your emails.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register"><button className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl font-semibold text-sm shadow-sm transition-all hover:-translate-y-px">Start for free →</button></Link>
            <Link to="/validate"><button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all hover:-translate-y-px">Try email validator</button></Link>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-px max-w-xl mx-auto bg-slate-200 rounded-2xl overflow-hidden border border-slate-200">
            {[{ v: "99.9%", l: "Validation accuracy" }, { v: "< 5s", l: "Verify time" }, { v: "Free", l: "To get started" }].map((s) => (
              <div key={s.l} className="bg-white px-6 py-5 text-center">
                <div className="text-2xl font-bold text-slate-900">{s.v}</div>
                <div className="text-xs text-slate-400 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-14 px-6 border-t border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{ v: "10k+", l: "Emails validated" }, { v: "500+", l: "Campaigns sent" }, { v: "99.9%", l: "Uptime" }, { v: "< 5s", l: "Avg. verify time" }].map((s) => (
            <div key={s.l}><div className="text-3xl font-bold text-slate-900 mb-1">{s.v}</div><div className="text-sm text-slate-400">{s.l}</div></div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Everything you need to send at scale</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-6 transition-all hover:shadow-sm">
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border mb-4 ${f.bg} ${f.color}`}>{f.tag}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 border-t border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Up and running in minutes</h2>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Create your campaign", desc: "Set a name, subject line, and write your HTML email content in the editor." },
              { n: "02", title: "Add & validate contacts", desc: "Import a CSV or add contacts manually. Run bulk validation to filter bad addresses before sending." },
              { n: "03", title: "Send & track", desc: "Hit send — emails are queued and delivered. Watch opens, clicks, and bounces roll in live." },
            ].map((s) => (
              <div key={s.n} className="relative flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg z-10">{s.n}</div>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ValidatorWidget />

      {/* CTA */}
      <section className="py-24 px-6 border-t border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden bg-indigo-600 p-16 text-center">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="relative space-y-6">
              <h2 className="text-4xl font-bold text-white tracking-tight">Ready to send smarter?</h2>
              <p className="text-indigo-100 text-base max-w-lg mx-auto">Join builders who use ReachX to understand their email systems from the inside out.</p>
              <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
                <Link to="/register"><button className="bg-white hover:bg-slate-50 text-indigo-600 px-8 py-3.5 rounded-xl font-semibold text-sm shadow-sm transition-all hover:-translate-y-px">Get started for free →</button></Link>
                <Link to="/login"><button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:-translate-y-px">Sign in</button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <Logo />
          <div className="flex items-center gap-6">
            <Link to="/validate" className="hover:text-slate-700 transition-colors">Validator</Link>
            <Link to="/login" className="hover:text-slate-700 transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-slate-700 transition-colors">Register</Link>
          </div>
          <span>© 2026 ReachX · Built for builders</span>
        </div>
      </footer>
    </div>
  );
}
