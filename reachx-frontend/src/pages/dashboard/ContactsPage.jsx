import { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Reusable multi-select checkbox dropdown
function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(val) {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  }

  const activeCount = selected.length;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 bg-white border rounded-xl px-3 py-2 text-xs font-medium transition-all ${activeCount > 0 ? "border-indigo-300 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
        {label}{activeCount > 0 && <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{activeCount}</span>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-[160px] py-1.5">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No options</p>
          ) : (
            options.map((opt) => (
              <label key={opt} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs text-slate-700">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded border-slate-300 text-indigo-600" />
                {opt}
              </label>
            ))
          )}
          {activeCount > 0 && (
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button onClick={() => onChange([])} className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 transition-colors">Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", phone: "", company: "", tags: "" });
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [sortBy, setSortBy] = useState("newest");
  // multi-select filters
  const [filterCompanies, setFilterCompanies] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [filterSources, setFilterSources] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);

  useEffect(() => { api.get("/api/contacts").then((r) => r.json()).then(setContacts); }, []);

  function toggleSelect(id) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  // Derive unique option lists from contacts
  const allCompanies = [...new Set(contacts.map((c) => c.company).filter(Boolean))].sort();
  const allTags = [...new Set(contacts.flatMap((c) => c.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []))].sort();
  const allSources = [...new Set(contacts.map((c) => c.segmentName ? "Segment" : "Direct"))];
  const allStatuses = ["Active", "Unsubscribed"];

  const filtered = contacts
    .filter((c) =>
      !search.trim() ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .filter((c) => filterCompanies.length === 0 || filterCompanies.includes(c.company ?? ""))
    .filter((c) => filterTags.length === 0 || filterTags.some((t) => c.tags?.split(",").map((x) => x.trim()).includes(t)))
    .filter((c) => filterSources.length === 0 || filterSources.includes(c.segmentName ? "Segment" : "Direct"))
    .filter((c) => filterStatuses.length === 0 || filterStatuses.includes(c.unsubscribed ? "Unsubscribed" : "Active"))
    .sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "name_az") return (a.name ?? a.email).localeCompare(b.name ?? b.email);
      if (sortBy === "name_za") return (b.name ?? b.email).localeCompare(a.name ?? a.email);
      if (sortBy === "company") return (a.company ?? "").localeCompare(b.company ?? "");
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const activeFiltersCount = filterCompanies.length + filterTags.length + filterSources.length + filterStatuses.length;

  function clearAll() {
    setFilterCompanies([]); setFilterTags([]); setFilterSources([]); setFilterStatuses([]); setSortBy("newest");
  }

  async function handleAdd() {
    setLoading(true);
    const res = await api.post("/api/contacts", form);
    if (res.ok) {
      const contact = await res.json();
      setContacts((prev) => [contact, ...prev.filter((c) => c.id !== contact.id)]);
      setShowAdd(false);
      setForm({ email: "", name: "", phone: "", company: "", tags: "" });
    }
    setLoading(false);
  }

  async function handleImport() {
    setLoading(true);
    const lines = csvText.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((row) => {
      const vals = row.split(",").map((v) => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    });
    await api.post("/api/contacts/import", { contacts: rows });
    const res = await api.get("/api/contacts");
    setContacts(await res.json());
    setShowImport(false);
    setCsvText("");
    setLoading(false);
  }

  async function handleDelete(id) {
    await api.delete("/api/contacts", { id });
    setContacts(contacts.filter((c) => c.id !== id));
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} contact${selected.size !== 1 ? "s" : ""}?`)) return;
    await api.post("/api/contacts/bulk", { action: "delete", ids: Array.from(selected) });
    setContacts(contacts.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">CRM</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contacts</h1>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
                  Delete {selected.size}
                </button>
              )}
              <button onClick={() => setShowImport(true)} className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">Import CSV</button>
              <a href={`${BASE}/api/contacts/export`} download className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">Export CSV</a>
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:-translate-y-px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Contact
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[{ label: "Total contacts", value: contacts.length, color: "text-indigo-600" }, { label: "With company", value: contacts.filter((c) => c.company).length, color: "text-violet-600" }, { label: "Tagged", value: contacts.filter((c) => c.tags).length, color: "text-emerald-600" }].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 hover:shadow-sm transition-all">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {contacts.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort */}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name_az">Name A→Z</option>
                <option value="name_za">Name Z→A</option>
                <option value="company">Company A→Z</option>
              </select>

              <MultiSelect label="Company" options={allCompanies} selected={filterCompanies} onChange={setFilterCompanies} />
              <MultiSelect label="Tags" options={allTags} selected={filterTags} onChange={setFilterTags} />
              <MultiSelect label="Source" options={allSources} selected={filterSources} onChange={setFilterSources} />
              <MultiSelect label="Status" options={allStatuses} selected={filterStatuses} onChange={setFilterStatuses} />

              {activeFiltersCount > 0 && (
                <button onClick={clearAll} className="text-xs text-rose-500 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-xl px-3 py-2 transition-all">
                  Clear ({activeFiltersCount})
                </button>
              )}

              {/* Search on right */}
              <div className="ml-auto relative">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-52 bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
              </div>
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-20 text-center">
              <p className="text-slate-800 font-semibold mb-1">No contacts yet</p>
              <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Add contacts manually or import a CSV to get started.</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all">Add Contact</button>
                <button onClick={() => setShowImport(true)} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-all">Import CSV</button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">No contacts match the current filters.</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left">
                      <input type="checkbox" checked={filtered.length > 0 && filtered.every((c) => selected.has(c.id))} onChange={() => setSelected(filtered.every((c) => selected.has(c.id)) ? new Set() : new Set(filtered.map((c) => c.id)))} className="rounded border-slate-300" />
                    </th>
                    {["Email", "Name", "Company", "Tags", "Status", "Source", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-3.5"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300" /></td>
                      <td className="px-5 py-3.5 font-mono text-slate-700 text-xs">{c.email}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.name ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.company ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5">
                        {c.tags ? c.tags.split(",").map((t) => (
                          <span key={t} className="inline-block mr-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 border border-indigo-100 text-indigo-600">{t.trim()}</span>
                        )) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.unsubscribed
                          ? <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-50 border border-rose-200 text-rose-500">Unsubscribed</span>
                          : <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-600">Active</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.segmentName
                          ? <span className="px-2 py-0.5 rounded-full text-[11px] bg-violet-50 border border-violet-100 text-violet-600">{c.segmentName}</span>
                          : <span className="text-slate-400 text-xs">Direct</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => handleDelete(c.id)} className="text-xs text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
                {filtered.length} of {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </main>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">Add Contact</h2><button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700">✕</button></div>
            <input placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
            <input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputCls} />
            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd} disabled={loading || !form.email} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">{loading ? "Adding..." : "Add Contact"}</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">Import CSV</h2><button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-700">✕</button></div>
            <p className="text-sm text-slate-500">First row must be headers: <span className="font-mono text-slate-700">email, name, phone, company, tags</span></p>
            <label className="flex items-center justify-center gap-3 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl px-4 py-5 cursor-pointer transition-all hover:bg-indigo-50/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span className="text-sm text-slate-500">Upload a <span className="text-indigo-600 font-semibold">.csv file</span> or paste below</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setCsvText(ev.target.result);
                reader.readAsText(file);
              }} />
            </label>
            <textarea placeholder={"email,name,phone,company,tags\njohn@example.com,John Doe,,,newsletter"} rows={8} value={csvText} onChange={(e) => setCsvText(e.target.value)} className={`${inputCls} font-mono resize-none`} />
            <div className="flex gap-2">
              <button onClick={handleImport} disabled={loading || !csvText.trim()} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">{loading ? "Importing..." : "Import"}</button>
              <button onClick={() => setShowImport(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
