import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";

export default function SegmentsPage() {
  const [segments, setSegments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", filterType: "tag", filterValue: "" });
  const [uploadText, setUploadText] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [segmentContacts, setSegmentContacts] = useState({});
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [addEmailInput, setAddEmailInput] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => { loadSegments(); }, []);

  async function loadSegments() {
    const res = await api.get("/api/segments");
    setSegments(await res.json());
  }

  async function toggleExpand(seg) {
    if (expandedId === seg.id) { setExpandedId(null); return; }
    setExpandedId(seg.id);
    if (!segmentContacts[seg.id]) await fetchContacts(seg.id);
  }

  async function fetchContacts(id) {
    setLoadingContacts(true);
    const res = await api.get(`/api/segments/${id}/contacts`);
    const data = await res.json();
    setSegmentContacts((prev) => ({ ...prev, [id]: data.contacts ?? [] }));
    setLoadingContacts(false);
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
    if (expandedId === id) setExpandedId(null);
  }

  async function handleDeleteContact(segId, email) {
    await api.delete(`/api/segments/${segId}/contacts`, { email });
    setSegmentContacts((prev) => ({ ...prev, [segId]: prev[segId].filter((c) => c.email !== email) }));
    setSegments((prev) => prev.map((s) => s.id === segId ? { ...s, _count: (s._count ?? 1) - 1 } : s));
  }

  async function handleAddContact(segId) {
    const email = addEmailInput.trim();
    if (!email) return;
    setAddingContact(true);
    await api.post(`/api/segments/${segId}/contacts`, { email });
    await fetchContacts(segId);
    setAddEmailInput("");
    setAddingContact(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between pt-1">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">CRM</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Segments</h1>
              <p className="text-slate-500 text-sm mt-1">Create a segment by tag, status, date range, or upload a contact list.</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-sm font-semibold transition-all shadow-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New segment
            </button>
          </div>

          {segments.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center">
              <p className="text-slate-500 text-sm mb-4">Create a reusable segment from tags, contact status, dates, or upload a list.</p>
              <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-all">Create segment</button>
            </div>
          ) : (
            <div className="space-y-3">
              {segments.map((seg) => (
                <div key={seg.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {/* Segment header row */}
                  <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(seg)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-slate-900">{seg.name}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {seg.filterType === "manual" ? "Uploaded list" : seg.filterType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Created {new Date(seg.createdAt).toLocaleDateString()}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`shrink-0 text-slate-400 transition-transform ${expandedId === seg.id ? "rotate-180" : ""}`}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    <button onClick={() => handleDelete(seg.id)} className="ml-4 p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>

                  {/* Expanded contacts */}
                  {expandedId === seg.id && (
                    <div className="border-t border-slate-100">
                      {seg.filterType === "manual" && (
                        <div className="px-6 py-3 flex gap-2 border-b border-slate-100">
                          <input
                            placeholder="Add email..."
                            value={addEmailInput}
                            onChange={(e) => setAddEmailInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddContact(seg.id)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                          <button onClick={() => handleAddContact(seg.id)} disabled={addingContact || !addEmailInput.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                            {addingContact ? "Adding..." : "Add"}
                          </button>
                        </div>
                      )}
                      {loadingContacts ? (
                        <div className="px-6 py-6 text-center text-slate-400 text-sm">Loading...</div>
                      ) : !segmentContacts[seg.id] || segmentContacts[seg.id].length === 0 ? (
                        <div className="px-6 py-6 text-center text-slate-400 text-sm">No contacts in this segment.</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-6 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Company</th>
                              <th className="px-6 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {segmentContacts[seg.id].map((c) => (
                              <tr key={c.id} className="hover:bg-slate-50 group">
                                <td className="px-6 py-3 font-mono text-xs text-slate-700">{c.email}</td>
                                <td className="px-6 py-3 text-slate-600">{c.name || <span className="text-slate-300">—</span>}</td>
                                <td className="px-6 py-3 text-slate-600">{c.company || <span className="text-slate-300">—</span>}</td>
                                <td className="px-6 py-3 text-right">
                                  {seg.filterType === "manual" && (
                                    <button onClick={() => handleDeleteContact(seg.id, c.email)}
                                      className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div className="px-6 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
                        {segmentContacts[seg.id]?.length ?? 0} contact{segmentContacts[seg.id]?.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">New Segment</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
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
                <textarea placeholder="email,name,phone,company,tags&#10;john@example.com,John Doe,,,newsletter" value={uploadText} onChange={(e) => setUploadText(e.target.value)} rows={6} className={`${inputCls} font-mono resize-none`} />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd} disabled={loading || !form.name || (form.filterType === "manual" && !uploadText.trim())}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                {loading ? "Creating..." : "Create Segment"}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
