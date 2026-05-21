import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", phone: "", company: "", tags: "" });
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => { api.get("/api/contacts").then((r) => r.json()).then(setContacts); }, []);

  function toggleSelect(id) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const categories = [{ name: "All", count: contacts.length }];
  const categoryMap = contacts.reduce((map, c) => {
    const tags = c.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
    if (tags.length === 0) map.set("Uncategorized", (map.get("Uncategorized") ?? 0) + 1);
    for (const tag of tags) map.set(tag, (map.get(tag) ?? 0) + 1);
    return map;
  }, new Map());
  for (const [name, count] of categoryMap.entries()) categories.push({ name, count });

  const categoryFiltered = selectedCategory === "All" ? contacts
    : selectedCategory === "Uncategorized" ? contacts.filter((c) => !c.tags?.trim())
    : contacts.filter((c) => c.tags?.split(",").map((t) => t.trim().toLowerCase()).includes(selectedCategory.toLowerCase()));

  const filtered = categoryFiltered.filter((c) =>
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? "").toLowerCase().includes(search.toLowerCase())
  );

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

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${selectedCategory === cat.name ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          )}

          {contacts.length > 0 && (
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
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
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">No contacts match "{search}"</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left">
                      <input type="checkbox" checked={filtered.length > 0 && filtered.every((c) => selected.has(c.id))} onChange={() => setSelected(filtered.every((c) => selected.has(c.id)) ? new Set() : new Set(filtered.map((c) => c.id)))} className="rounded border-slate-300" />
                    </th>
                    {["Email", "Name", "Company", "Tags", ""].map((h) => (
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
                        {c.unsubscribed && <span className="inline-block ml-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-50 border border-rose-200 text-rose-500">unsub</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => handleDelete(c.id)} className="text-xs text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
