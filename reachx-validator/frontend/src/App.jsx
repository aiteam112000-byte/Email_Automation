import { useState, useEffect } from "react";
import gtmLogo from "./assets/gtm-logo.png";

const API_BASE = "/api/validate";
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
  const rows = [
    ["Email", "Status", "Reason"],
    ...results.map(r => [r.email, r.status, r.reason]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

export default function App() {
  const [tab, setTab] = useState("bulk");
  const [input, setInput] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [results, setResults] = useState([]);
  const [singleResult, setSingleResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vx_history") ?? "[]"); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  const emails = input.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
  const tooMany = emails.length > MAX_EMAILS;
  const counts = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
  const filtered = filter === "ALL" ? results : results.filter(r => r.status === filter);

  function saveToHistory(res, label) {
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      label,
      total: res.length,
      valid: res.filter(r => r.status === "VALID").length,
      risky: res.filter(r => r.status === "RISKY").length,
      invalid: res.filter(r => r.status === "INVALID").length,
      results: res,
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem("vx_history", JSON.stringify(updated));
  }

  async function handleBulk() {
    if (!emails.length || tooMany) return;
    setLoading(true); setResults([]); setMethod(""); setFilter("ALL");
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      const r = data.results ?? [];
      setResults(r);
      setMethod(data.method ?? "");
      saveToHistory(r, `Bulk — ${emails.length} emails`);
    } catch { setResults([]); }
    setLoading(false);
  }

  async function handleSingle() {
    if (!singleEmail.trim()) return;
    setLoading(true); setSingleResult(null);
    try {
      const res = await fetch(`${API_BASE}/single?email=${encodeURIComponent(singleEmail.trim())}`);
      const data = await res.json();
      setSingleResult(data);
      saveToHistory([data], `Single — ${singleEmail.trim()}`);
    } catch { setSingleResult(null); }
    setLoading(false);
  }

  function loadHistoryEntry(entry) {
    setResults(entry.results);
    setFilter("ALL");
    setTab("bulk");
    setShowHistory(false);
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("vx_history");
  }

  const pct = (n) => results.length ? ((n / results.length) * 100).toFixed(0) : "0";

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"'Inter',sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 32px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <img src={gtmLogo} alt="GTM Reach" style={{ height:32, objectFit:"contain" }} />
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, color:"#94a3b8" }}>Max {MAX_EMAILS.toLocaleString()} emails per run · Apify deep check · MX fallback</span>
          <button onClick={() => setShowHistory(true)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", fontSize:13, fontWeight:600, color:"#374151", cursor:"pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            History {history.length > 0 && <span style={{ background:"#2563eb", color:"#fff", borderRadius:100, padding:"1px 7px", fontSize:11 }}>{history.length}</span>}
          </button>
        </div>
      </header>

      <main style={{ maxWidth:960, margin:"0 auto", padding:"40px 24px" }}>

        {/* Title */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:100, padding:"4px 14px", fontSize:11, fontWeight:700, color:"#2563eb", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>
            Email Validation Tool
          </div>
          <h1 style={{ fontSize:36, fontWeight:800, color:"#0f172a", letterSpacing:"-0.03em", marginBottom:8 }}>
            Validate emails, instantly.
          </h1>
          <p style={{ fontSize:15, color:"#64748b", maxWidth:480, margin:"0 auto" }}>
            Format checks · MX records · Mailbox existence · Disposable detection
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, background:"#f1f5f9", borderRadius:12, padding:4, width:"fit-content", margin:"0 auto 32px" }}>
          {[["bulk","Bulk Validate"],["single","Single Check"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"8px 28px", borderRadius:9, border:"none", fontWeight:600, fontSize:13, cursor:"pointer", transition:"all 0.2s",
                background: tab===t ? "#fff" : "transparent",
                color: tab===t ? "#0f172a" : "#64748b",
                boxShadow: tab===t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── Bulk Tab ── */}
        {tab === "bulk" && (
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:20, padding:28, marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>
                Email addresses <span style={{ color:"#94a3b8", fontWeight:400 }}>— one per line or comma-separated</span>
              </label>
              <span style={{ fontSize:12, fontWeight:600, color: tooMany ? "#dc2626" : emails.length > 400 ? "#d97706" : "#94a3b8" }}>
                {emails.length} / {MAX_EMAILS}
              </span>
            </div>
            <textarea rows={9} value={input} onChange={e => setInput(e.target.value)}
              placeholder={"john@company.com\njane@startup.io\ntest@mailinator.com\n..."}
              style={{ width:"100%", border:`1px solid ${tooMany?"#fca5a5":"#e2e8f0"}`, borderRadius:12, padding:"12px 16px", fontSize:13, fontFamily:"monospace", color:"#1e293b", resize:"vertical", outline:"none", transition:"border-color 0.2s", lineHeight:1.6 }}
              onFocus={e => e.target.style.borderColor="#2563eb"}
              onBlur={e => e.target.style.borderColor=tooMany?"#fca5a5":"#e2e8f0"} />

            {tooMany && (
              <div style={{ marginTop:8, padding:"8px 14px", background:"#fff1f2", border:"1px solid #fecaca", borderRadius:9, fontSize:12, color:"#dc2626", fontWeight:600 }}>
                ⚠ Maximum {MAX_EMAILS} emails per run. Please remove {emails.length - MAX_EMAILS} email{emails.length - MAX_EMAILS !== 1 ? "s" : ""}.
              </div>
            )}

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14 }}>
              <span style={{ fontSize:13, color: tooMany ? "#dc2626" : emails.length ? "#2563eb" : "#94a3b8", fontWeight:600 }}>
                {tooMany ? `Too many emails (max ${MAX_EMAILS})` : emails.length > 0 ? `${emails.length} email${emails.length !== 1 ? "s" : ""} ready` : "Paste emails above"}
              </span>
              <button onClick={handleBulk} disabled={loading || !emails.length || tooMany}
                style={{ display:"flex", alignItems:"center", gap:8, background: loading||!emails.length||tooMany ? "#94a3b8":"#2563eb", color:"#fff", border:"none", borderRadius:10, padding:"11px 28px", fontSize:14, fontWeight:700, cursor: loading||!emails.length||tooMany?"not-allowed":"pointer", boxShadow: loading||!emails.length||tooMany?"none":"0 4px 14px rgba(37,99,235,0.35)", transition:"all 0.2s" }}>
                {loading ? <><SpinIcon />Validating...</> : `Validate ${emails.length || ""} Emails →`}
              </button>
            </div>
          </div>
        )}

        {/* ── Single Tab ── */}
        {tab === "single" && (
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:20, padding:28, marginBottom:28 }}>
            <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:10 }}>Email address</label>
            <div style={{ display:"flex", gap:10 }}>
              <input type="email" value={singleEmail} onChange={e => setSingleEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSingle()}
                placeholder="you@company.com"
                style={{ flex:1, border:"1px solid #e2e8f0", borderRadius:12, padding:"11px 16px", fontSize:14, outline:"none", transition:"border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor="#2563eb"}
                onBlur={e => e.target.style.borderColor="#e2e8f0"} />
              <button onClick={handleSingle} disabled={loading || !singleEmail.trim()}
                style={{ background: loading||!singleEmail.trim()?"#94a3b8":"#2563eb", color:"#fff", border:"none", borderRadius:12, padding:"11px 28px", fontSize:14, fontWeight:700, cursor: loading||!singleEmail.trim()?"not-allowed":"pointer", whiteSpace:"nowrap" }}>
                {loading ? "Checking..." : "Check →"}
              </button>
            </div>
            {singleResult && (
              <div style={{ marginTop:20, padding:20, borderRadius:14, border:`1px solid ${STATUS[singleResult.status]?.border??"#e2e8f0"}`, background: STATUS[singleResult.status]?.bg??"#f8fafc" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#64748b" }}>Result</span>
                  <Badge status={singleResult.status} />
                </div>
                {[["Email", singleResult.email, true], ["Status", singleResult.status, false], ["Detail", singleResult.reason, false]].map(([l, v, mono]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13, padding:"6px 0", borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
                    <span style={{ color:"#94a3b8" }}>{l}</span>
                    <span style={{ fontFamily: mono?"monospace":"inherit", color:"#1e293b", fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Results ── */}
        {results.length > 0 && tab === "bulk" && (
          <>
            {/* Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
              {[
                { label:"Total", value:results.length, bg:"#f8fafc", border:"#e2e8f0", text:"#0f172a", sub:"validated" },
                { label:"Deliverable", value:counts.VALID??0, ...STATUS.VALID, sub:`${pct(counts.VALID??0)}% of total` },
                { label:"Risky", value:counts.RISKY??0, ...STATUS.RISKY, sub:`${pct(counts.RISKY??0)}% of total` },
                { label:"Invalid", value:counts.INVALID??0, ...STATUS.INVALID, sub:`${pct(counts.INVALID??0)}% of total` },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:16, padding:"20px 22px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:34, fontWeight:800, color:s.text, letterSpacing:"-0.03em", lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Filter + export bar */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[["ALL",`All (${results.length})`],["VALID",`Deliverable (${counts.VALID??0})`],["RISKY",`Risky (${counts.RISKY??0})`],["INVALID",`Invalid (${counts.INVALID??0})`]].map(([f, l]) => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ padding:"6px 14px", borderRadius:8, border:"1px solid", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.2s",
                      borderColor: filter===f?"#2563eb":"#e2e8f0",
                      background: filter===f?"#eff6ff":"#fff",
                      color: filter===f?"#2563eb":"#64748b" }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {method && <span style={{ fontSize:11, color:"#94a3b8" }}>via {method === "apify" ? "Apify deep check" : "MX fast check"}</span>}
                <button onClick={() => downloadCSV(filtered, `validation-${filter.toLowerCase()}-${Date.now()}.csv`)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", fontSize:12, fontWeight:600, color:"#374151", cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#2563eb"; e.currentTarget.style.color="#2563eb"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.color="#374151"; }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download CSV ({filtered.length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"11px 20px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc", display:"grid", gridTemplateColumns:"1fr 140px 1fr", gap:16 }}>
                {["Email","Status","Detail"].map(h => (
                  <span key={h} style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
                ))}
              </div>
              <div style={{ maxHeight:460, overflowY:"auto" }}>
                {filtered.map(r => (
                  <div key={r.email} style={{ padding:"11px 20px", borderBottom:"1px solid #f8fafc", display:"grid", gridTemplateColumns:"1fr 140px 1fr", gap:16, alignItems:"center", transition:"background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background="#fff"}>
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

      {/* ── History Drawer ── */}
      {showHistory && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex" }}>
          <div style={{ flex:1, background:"rgba(0,0,0,0.4)" }} onClick={() => setShowHistory(false)} />
          <div style={{ width:480, background:"#fff", height:"100%", display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,0.12)" }}>
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:"#0f172a" }}>Validation History</h2>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                {history.length > 0 && (
                  <button onClick={clearHistory} style={{ fontSize:12, color:"#dc2626", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>Clear all</button>
                )}
                <button onClick={() => setShowHistory(false)} style={{ fontSize:20, color:"#94a3b8", background:"none", border:"none", cursor:"pointer", lineHeight:1 }}>×</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
              {history.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8", fontSize:14 }}>
                  No history yet.<br/>Run a validation to see it here.
                </div>
              ) : history.map(entry => (
                <div key={entry.id} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 18px", marginBottom:12, cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#2563eb"; e.currentTarget.style.background="#eff6ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.background="#f8fafc"; }}
                  onClick={() => loadHistoryEntry(entry)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", marginBottom:2 }}>{entry.label}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{entry.date}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:"#2563eb", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:100, padding:"2px 9px" }}>{entry.total} emails</span>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#16a34a", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:6, padding:"2px 8px" }}>✓ {entry.valid} valid</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"#d97706", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, padding:"2px 8px" }}>⚠ {entry.risky} risky</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"#dc2626", background:"#fff1f2", border:"1px solid #fecaca", borderRadius:6, padding:"2px 8px" }}>✗ {entry.invalid} invalid</span>
                    <button onClick={e => { e.stopPropagation(); downloadCSV(entry.results, `validation-${entry.id}.csv`); }}
                      style={{ marginLeft:"auto", fontSize:11, fontWeight:600, color:"#64748b", background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, padding:"2px 10px", cursor:"pointer" }}>
                      CSV
                    </button>
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
