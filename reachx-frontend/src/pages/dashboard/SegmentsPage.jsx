import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";

export default function SegmentsPage() {
  const [segments, setSegments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", filterType: "tag", filterValue: "" });
  const [uploadText, setUploadText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSegments(); }, []);

  async function loadSegments() {
    const res = await api.get("/api/segments");
    setSegments(await res.json());
  }

  function parseContactsText(text) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const firstLine = lines[0];
    const maybeHeaders = firstLine.split(",").map((h) => h.trim().toLowerCase());
    if (maybeHeaders.includes("email")) {
      const headers = maybeHeaders;
      return lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const contact = {};
        headers.forEach((h, i) => { contact[h] = values[i] ?? ""; });
        return contact;
      }).filter((c) => c.email?.trim());
    }
    return lines.map((line) => ({ email: line })).filter((c) => c.email?.trim());
  }

  async function handleAdd() {
    setLoading(true);
    const payload = { name: form.name, filterType: form.filterType, filterValue: form.filterType === "manual" ? "manual" : form.filterValue };
    if (form.filterType === "manual") payload.contacts = parseContactsText(uploadText);
    await api.post("/api/segments", payload);
    setLoading(false);
    setShowAdd(false);
    setForm({ name: "", filterType: "tag", filterValue: "" });
    setUploadText("");
    loadSegments();
  }

  async function handleDelete(id) {
    await api.delete("/api/segments", { id });
    setSegments(segments.filter((s) => s.id !== id));
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between pt-1">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Saved segments</h1>
              <p className="text-slate-500 text-sm mt-2 max-w-2xl">Create a segment by tag, status, date range, or upload a contact list once and reuse it across campaigns.</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-indigo-100/50">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New segment
            </button>
          </div>

          {segments.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-[28px] p-16 text-center">
              <p className="text-slate-500 text-sm mb-4">Create a reusable segment from tags, contact status, dates, or upload a list.</p>
              <button onClick={() => setShowAdd(true)} className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-indigo-100/50 transition-all">Create segment</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {segments.map((seg) => (
                <div key={seg.id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">{seg.filterType === "manual" ? "Uploaded list" : seg.filterType}</span>
                        {seg.filterType !== "manual" && seg.filterValue && <span className="text-xs text-slate-400">{seg.filterValue}</span>}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 truncate">{seg.name}</h3>
                      <p className="text-xs text-slate-400">Created {new Date(seg.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDelete(seg.id)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-rose-200 hover:text-rose-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAdd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">New Segment</h2><button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700">✕</button></div>
                <input placeholder="Segment name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Filter type</label>
                  <select value={form.filterType} onChange={(e) => setForm({ ...form, filterType: e.target.value, filterValue: "" })} className={inputCls}>
                    <option value="tag">Tag</option>
                    <option value="status">Status</option>
                    <option value="date">Added in last N days</option>
                    <option value="manual">Upload list</option>
                  </select>
                </div>
                {form.filterType === "tag" && <input placeholder="Tag name (e.g. customer)" value={form.filterValue} onChange={(e) => setForm({ ...form, filterValue: e.target.value })} className={inputCls} />}
                {form.filterType === "status" && (
                  <select value={form.filterValue} onChange={(e) => setForm({ ...form, filterValue: e.target.value })} className={inputCls}>
                    <option value="">Select status</option>
                    <option value="active">Active</option>
                    <option value="unsubscribed">Unsubscribed</option>
                    <option value="bounced">Bounced</option>
                  </select>
                )}
                {form.filterType === "date" && <input type="number" placeholder="Days (e.g. 30)" value={form.filterValue} onChange={(e) => setForm({ ...form, filterValue: e.target.value })} className={inputCls} />}
                {form.filterType === "manual" && (
                  <div className="space-y-3">
                    <input type="file" accept=".csv,.txt" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setUploadText(await file.text()); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" />
                    <textarea placeholder="email,name,phone,company,tags\njohn@example.com,John Doe,,,newsletter" value={uploadText} onChange={(e) => setUploadText(e.target.value)} rows={6} className={`${inputCls} font-mono resize-none`} />
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleAdd} disabled={loading || !form.name || (form.filterType === "manual" && !uploadText.trim())} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">{loading ? "Creating..." : "Create Segment"}</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
