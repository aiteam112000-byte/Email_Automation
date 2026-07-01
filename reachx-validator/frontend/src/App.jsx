import { useState } from "react";
import gtmLogo from "./assets/gtm-logo.png";

const API_BASE = "/api/validate";
const AUTH_BASE = "/api/auth";
const MAX_EMAILS = 500;

const STATUS = {
  VALID:   { label: "Deliverable",   bg: "#f0fdf4", border: "#86efac", text: "#16a34a", dot: "#22c55e" },
  RISKY:   { label: "Risky",         bg: "#fffbeb", border: "#fde68a", text: "#d97706", dot: "#f59e0b" },
  INVALID: { label: "Undeliverable", bg: "#fff1f2", border: "#fecaca", text: "#dc2626", dot: "#ef4444" },
};

function Badge({ status }) {
  const s = STATUS[status] ?? STATUS.INVALID;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 11px", borderRadius:100, border:`1px solid ${s.border}`, background:s.bg, fontSize:11, fontWeight:700, color:s.text, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
      {s.label}
    </span>
  );
}

function SpinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation:"spin 1s linear infinite", flexShrink:0 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

function downloadCSV(results, filename) {
  const rows = [["Email","Status","Reason"], ...results.map(r => [r.email, r.status, r.reason])];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
  a.download = filename; a.click();
}

function parseCSVEmails(text) {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return text.split(/\r?\n/).flatMap(line => line.split(",").map(cell => cell.replace(/^"|"$/g,"").trim())).filter(v => emailRe.test(v));
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${AUTH_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); setLoading(false); return; }
      onLogin(data.sessionId, data.username);
    } catch { setError("Could not connect to server"); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <div style={{ width:380, background:"#fff", border:"1px solid #e2e8f0", borderRadius:24, padding:"40px 36px", boxShadow:"0 4px 40px rgba(0,0,0,0.07)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <img src={gtmLogo} alt="GTM Reach" style={{ height:36, objectFit:"contain", marginBottom:20 }} />
          <h1 style={{ fontSize:22, fontWeight:800, color:"#0f172a", margin:"0 0 6px" }}>Sign in</h1>
          <p style={{ fontSize:13, color:"#64748b", margin:0 }}>ReachX Email Validator</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username"
              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor="#2563eb"} onBlur={e => e.target.style.borderColor="#e2e8f0"} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor="#2563eb"} onBlur={e => e.target.style.borderColor="#e2e8f0"} />
          </div>
          {error && <div style={{ marginBottom:14, padding:"9px 14px", background:"#fff1f2", border:"1px solid #fecaca", borderRadius:9, fontSize:12, color:"#dc2626", fontWeight:600 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width:"100%", background: loading?"#94a3b8":"#2563eb", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor: loading?"not-allowed":"pointer" }}>
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ sessionId, username, onClose }) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!token.trim()) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`${AUTH_BASE}/set-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body: JSON.stringify({ apifyToken: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); setSaving(false); return; }
      setSaved(true); setToken("");
    } catch { setError("Could not connect to server"); }
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:500, background:"#fff", borderRadius:20, padding:"32px 36px", boxShadow:"0 8px 60px rgba(0,0,0,0.15)", fontFamily:"'Inter',sans-serif" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:"#0f172a", margin:0 }}>Apify Settings</h2>
          <button onClick={onClose} style={{ fontSize:22, color:"#94a3b8", background:"none", border:"none", cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, padding:"14px 16px", marginBottom:22, fontSize:13, color:"#1e40af", lineHeight:1.6 }}>
          <strong>Logged in as:</strong> {username}<br/>
          Your Apify token is used only for your session and is not shared with other users.
        </div>

        {/* Step 1 */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Step 1 — Get your token</div>
          <a href="https://console.apify.com/account/integrations" target="_blank" rel="noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:9, border:"1px solid #bfdbfe", background:"#eff6ff", fontSize:13, fontWeight:600, color:"#2563eb", textDecoration:"none" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open Apify → Account → Integrations
          </a>
        </div>

        {/* Step 2 */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Step 2 — Approve the actor</div>
          <a href="https://console.apify.com/actors/VJ5w50TP6mAbyimyO?approvePermissions=true" target="_blank" rel="noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:9, border:"1px solid #fde68a", background:"#fffbeb", fontSize:13, fontWeight:600, color:"#d97706", textDecoration:"none" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Approve Email Verifier Actor
          </a>
          <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>Must be done once per Apify account before the token will work.</div>
        </div>

        {/* Step 3 */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Step 3 — Paste your token</div>
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="apify_api_xxxxxxxxxxxx"
            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"monospace", outline:"none", boxSizing:"border-box" }}
            onFocus={e => e.target.style.borderColor="#2563eb"} onBlur={e => e.target.style.borderColor="#e2e8f0"} />
        </div>

        {error && <div style={{ marginBottom:12, padding:"8px 14px", background:"#fff1f2", border:"1px solid #fecaca", borderRadius:9, fontSize:12, color:"#dc2626", fontWeight:600 }}>{error}</div>}
        {saved && <div style={{ marginBottom:12, padding:"8px 14px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:9, fontSize:12, color:"#16a34a", fontWeight:600 }}>✓ Token saved for this session</div>}

        <button onClick={handleSave} disabled={saving || !token.trim()}
          style={{ width:"100%", background: saving||!token.trim()?"#94a3b8":"#2563eb", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor: saving||!token.trim()?"not-allowed":"pointer" }}>
          {saving ? "Saving..." : "Save Token →"}
        </button>
      </div>
    </div>
  );
}

// --- Main App -----------------------------------------------------------------
function historyKey(username) { return `vx_history_${username}`; }

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vx_session") ?? "null"); } catch { return null; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState("bulk");
  const [input, setInput] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState([]);
  const [singleResult, setSingleResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [history, setHistory] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("vx_session") ?? "null");
      if (!s?.username) return [];
      return JSON.parse(localStorage.getItem(historyKey(s.username)) ?? "[]");
    } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  function handleLogin(sessionId, username) {
    const s = { sessionId, username };
    setSession(s);
    localStorage.setItem("vx_session", JSON.stringify(s));
    // Load this user's history
    try {
      const userHistory = JSON.parse(localStorage.getItem(historyKey(username)) ?? "[]");
      setHistory(userHistory);
    } catch { setHistory([]); }
  }

  async function handleLogout() {
    if (session) {
      await fetch(`${AUTH_BASE}/logout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      }).catch(() => {});
    }
    setSession(null);
    localStorage.removeItem("vx_session");
    setHistory([]);
  }

  if (!session) return <LoginPage onLogin={handleLogin} />;

  const emails = input.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
  const tooMany = emails.length > MAX_EMAILS;
  const counts = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
  const filtered = filter === "ALL" ? results : results.filter(r => r.status === filter);

  function saveToHistory(res, label) {
    const entry = { id: Date.now(), date: new Date().toLocaleString(), label, total: res.length,
      valid: res.filter(r => r.status === "VALID").length, risky: res.filter(r => r.status === "RISKY").length,
      invalid: res.filter(r => r.status === "INVALID").length, results: res };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(historyKey(session.username), JSON.stringify(updated));
  }

  function handleCSVFile(file) {
    if (!file || !file.name.endsWith(".csv")) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setInput(parseCSVEmails(e.target.result).join("\n"));
    reader.readAsText(file);
  }

  async function handleBulk() {
    if (!emails.length || tooMany) return;
    setLoading(true); setResults([]); setMethod(""); setFilter("ALL");
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": session.sessionId },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      const r = data.results ?? [];
      setResults(r); setMethod(data.method ?? "");
      saveToHistory(r, `Bulk - ${emails.length} emails`);
    } catch { setResults([]); }
    setLoading(false);
  }

  async function handleSingle() {
    if (!singleEmail.trim()) return;
    setLoading(true); setSingleResult(null);
    try {
      const res = await fetch(`${API_BASE}/single?email=${encodeURIComponent(singleEmail.trim())}`, {
        headers: { "x-session-id": session.sessionId },
      });
      const data = await res.json();
      setSingleResult(data);
      saveToHistory([data], `Single - ${singleEmail.trim()}`);
    } catch { setSingleResult(null); }
    setLoading(false);
  }

  const pct = (n) => results.length ? ((n / results.length) * 100).toFixed(0) : "0";

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"'Inter',sans-serif" }}>
      {showSettings && <SettingsModal sessionId={session.sessionId} username={session.username} onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <header style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 32px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <img src={gtmLogo} alt="GTM Reach" style={{ height:32, objectFit:"contain" }} />
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color:"#94a3b8" }}>Max {MAX_EMAILS.toLocaleString()} emails per run</span>
          <button onClick={() => setShowHistory(true)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", fontSize:12, fontWeight:600, color:"#374151", cursor:"pointer" }}>
            History {history.length > 0 && <span style={{ background:"#2563eb", color:"#fff", borderRadius:100, padding:"1px 7px", fontSize:11 }}>{history.length}</span>}
          </button>
          <button onClick={() => setShowSettings(true)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", fontSize:12, fontWeight:600, color:"#374151", cursor:"pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Apify Token
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:9, background:"#f1f5f9", fontSize:12, fontWeight:600, color:"#374151" }}>
            ?? {session.username}
            <button onClick={handleLogout} style={{ fontSize:11, color:"#dc2626", background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0 }}>Sign out</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:960, margin:"0 auto", padding:"40px 24px" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:100, padding:"4px 14px", fontSize:11, fontWeight:700, color:"#2563eb", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>Email Validation Tool</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:"#0f172a", letterSpacing:"-0.03em", marginBottom:8 }}>Validate emails, instantly.</h1>
          <p style={{ fontSize:15, color:"#64748b", maxWidth:480, margin:"0 auto" }}>Format checks &middot; MX records &middot; Mailbox existence &middot; Disposable detection</p>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, background:"#f1f5f9", borderRadius:12, padding:4, width:"fit-content", margin:"0 auto 32px" }}>
          {[["bulk","Bulk Validate"],["single","Single Check"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"8px 28px", borderRadius:9, border:"none", fontWeight:600, fontSize:13, cursor:"pointer",
                background: tab===t?"#fff":"transparent", color: tab===t?"#0f172a":"#64748b",
                boxShadow: tab===t?"0 1px 4px rgba(0,0,0,0.08)":"none" }}>{l}</button>
          ))}
        </div>

        {/* Bulk Tab */}
        {tab === "bulk" && (
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:20, padding:28, marginBottom:28 }}>
            {/* CSV Upload */}
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleCSVFile(e.dataTransfer.files[0]); }}
              style={{ border:`2px dashed ${dragOver?"#2563eb":"#cbd5e1"}`, borderRadius:14, padding:"16px 20px", marginBottom:18, background: dragOver?"#eff6ff":"#f8fafc", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dragOver?"#2563eb":"#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: dragOver?"#2563eb":"#374151" }}>{csvFileName ? `\u2713 ${csvFileName}` : "Upload CSV file"}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>Drag &amp; drop or click Browse &mdash; emails auto-extracted</div>
                </div>
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 18px", borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", fontSize:12, fontWeight:600, color:"#374151", cursor:"pointer", flexShrink:0 }}>
                Browse
                <input type="file" accept=".csv" style={{ display:"none" }} onChange={e => handleCSVFile(e.target.files[0])} />
              </label>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Email addresses <span style={{ color:"#94a3b8", fontWeight:400 }}>— one per line or comma-separated</span></label>
              <span style={{ fontSize:12, fontWeight:600, color: tooMany?"#dc2626": emails.length>400?"#d97706":"#94a3b8" }}>{emails.length} / {MAX_EMAILS}</span>
            </div>
            <textarea rows={9} value={input} onChange={e => setInput(e.target.value)} placeholder={"john@company.com\njane@startup.io\ntest@mailinator.com"}
              style={{ width:"100%", border:`1px solid ${tooMany?"#fca5a5":"#e2e8f0"}`, borderRadius:12, padding:"12px 16px", fontSize:13, fontFamily:"monospace", color:"#1e293b", resize:"vertical", outline:"none", lineHeight:1.6, boxSizing:"border-box" }} />
            {tooMany && <div style={{ marginTop:8, padding:"8px 14px", background:"#fff1f2", border:"1px solid #fecaca", borderRadius:9, fontSize:12, color:"#dc2626", fontWeight:600 }}>Max {MAX_EMAILS} emails. Remove {emails.length - MAX_EMAILS} more.</div>}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14 }}>
              <span style={{ fontSize:13, color: tooMany?"#dc2626": emails.length?"#2563eb":"#94a3b8", fontWeight:600 }}>
                {tooMany ? `Too many emails` : emails.length > 0 ? `${emails.length} email${emails.length!==1?"s":""} ready` : "Paste emails above"}
              </span>
              <button onClick={handleBulk} disabled={loading||!emails.length||tooMany}
                style={{ display:"flex", alignItems:"center", gap:8, background: loading||!emails.length||tooMany?"#94a3b8":"#2563eb", color:"#fff", border:"none", borderRadius:10, padding:"11px 28px", fontSize:14, fontWeight:700, cursor: loading||!emails.length||tooMany?"not-allowed":"pointer" }}>
                {loading ? <><SpinIcon />Validating...</> : `Validate ${emails.length || ""} Emails`}
              </button>
            </div>
          </div>
        )}

        {/* Single Tab */}
        {tab === "single" && (
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:20, padding:28, marginBottom:28 }}>
            <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:10 }}>Email address</label>
            <div style={{ display:"flex", gap:10 }}>
              <input type="email" value={singleEmail} onChange={e => setSingleEmail(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleSingle()} placeholder="you@company.com"
                style={{ flex:1, border:"1px solid #e2e8f0", borderRadius:12, padding:"11px 16px", fontSize:14, outline:"none" }} />
              <button onClick={handleSingle} disabled={loading||!singleEmail.trim()}
                style={{ background: loading||!singleEmail.trim()?"#94a3b8":"#2563eb", color:"#fff", border:"none", borderRadius:12, padding:"11px 28px", fontSize:14, fontWeight:700, cursor: loading||!singleEmail.trim()?"not-allowed":"pointer" }}>
                {loading ? "Checking..." : "Check"}
              </button>
            </div>
            {singleResult && (
              <div style={{ marginTop:20, padding:20, borderRadius:14, border:`1px solid ${STATUS[singleResult.status]?.border??"#e2e8f0"}`, background: STATUS[singleResult.status]?.bg??"#f8fafc" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#64748b" }}>Result</span>
                  <Badge status={singleResult.status} />
                </div>
                {[["Email",singleResult.email,true],["Status",singleResult.status,false],["Detail",singleResult.reason,false]].map(([l,v,mono]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"6px 0", borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
                    <span style={{ color:"#94a3b8" }}>{l}</span>
                    <span style={{ fontFamily:mono?"monospace":"inherit", color:"#1e293b", fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && tab === "bulk" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
              {[
                { label:"Total", value:results.length, bg:"#f8fafc", border:"#e2e8f0", text:"#0f172a", sub:"validated" },
                { label:"Deliverable", value:counts.VALID??0, ...STATUS.VALID, sub:`${pct(counts.VALID??0)}%` },
                { label:"Risky", value:counts.RISKY??0, ...STATUS.RISKY, sub:`${pct(counts.RISKY??0)}%` },
                { label:"Invalid", value:counts.INVALID??0, ...STATUS.INVALID, sub:`${pct(counts.INVALID??0)}%` },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:16, padding:"20px 22px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:34, fontWeight:800, color:s.text, letterSpacing:"-0.03em", lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", gap:6 }}>
                {[["ALL",`All (${results.length})`],["VALID",`Deliverable (${counts.VALID??0})`],["RISKY",`Risky (${counts.RISKY??0})`],["INVALID",`Invalid (${counts.INVALID??0})`]].map(([f,l]) => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ padding:"6px 14px", borderRadius:8, border:"1px solid", fontSize:12, fontWeight:600, cursor:"pointer",
                      borderColor:filter===f?"#2563eb":"#e2e8f0", background:filter===f?"#eff6ff":"#fff", color:filter===f?"#2563eb":"#64748b" }}>{l}</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {method && <span style={{ fontSize:11, color:"#94a3b8" }}>via {method==="apify"?"Apify deep check":"MX fast check"}</span>}
                <button onClick={() => downloadCSV(filtered, `validation-${filter.toLowerCase()}-${Date.now()}.csv`)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", fontSize:12, fontWeight:600, color:"#374151", cursor:"pointer" }}>
                  Download CSV ({filtered.length})
                </button>
              </div>
            </div>
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"11px 20px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc", display:"grid", gridTemplateColumns:"1fr 140px 1fr", gap:16 }}>
                {["Email","Status","Detail"].map(h => <span key={h} style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>)}
              </div>
              <div style={{ maxHeight:460, overflowY:"auto" }}>
                {filtered.map(r => (
                  <div key={r.email} style={{ padding:"11px 20px", borderBottom:"1px solid #f8fafc", display:"grid", gridTemplateColumns:"1fr 140px 1fr", gap:16, alignItems:"center" }}>
                    <span style={{ fontFamily:"monospace", fontSize:13, color:"#1e293b" }}>{r.email}</span>
                    <Badge status={r.status} />
                    <span style={{ fontSize:13, color:"#64748b" }}>{r.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* History Drawer */}
      {showHistory && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex" }}>
          <div style={{ flex:1, background:"rgba(0,0,0,0.4)" }} onClick={() => setShowHistory(false)} />
          <div style={{ width:480, background:"#fff", height:"100%", display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,0.12)" }}>
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:"#0f172a", margin:0 }}>Validation History</h2>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                {history.length > 0 && <button onClick={() => { setHistory([]); localStorage.removeItem(historyKey(session.username)); }} style={{ fontSize:12, color:"#dc2626", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>Clear all</button>}
                <button onClick={() => setShowHistory(false)} style={{ fontSize:20, color:"#94a3b8", background:"none", border:"none", cursor:"pointer" }}>�</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
              {history.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8", fontSize:14 }}>No history yet.</div>
              ) : history.map(entry => (
                <div key={entry.id} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 18px", marginBottom:12, cursor:"pointer" }}
                  onClick={() => { setResults(entry.results); setFilter("ALL"); setTab("bulk"); setShowHistory(false); }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", marginBottom:2 }}>{entry.label}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{entry.date}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:"#2563eb", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:100, padding:"2px 9px" }}>{entry.total} emails</span>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#16a34a", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:6, padding:"2px 8px" }}>? {entry.valid}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"#d97706", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, padding:"2px 8px" }}>? {entry.risky}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"#dc2626", background:"#fff1f2", border:"1px solid #fecaca", borderRadius:6, padding:"2px 8px" }}>? {entry.invalid}</span>
                    <button onClick={e => { e.stopPropagation(); downloadCSV(entry.results, `validation-${entry.id}.csv`); }}
                      style={{ marginLeft:"auto", fontSize:11, fontWeight:600, color:"#64748b", background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, padding:"2px 10px", cursor:"pointer" }}>CSV</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
