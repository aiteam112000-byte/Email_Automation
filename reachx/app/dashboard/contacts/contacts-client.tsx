"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActivityPanel } from "./activity-panel";

type Contact = { id: string; email: string; name: string | null; phone: string | null; company: string | null; tags: string | null; unsubscribed?: boolean };

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";
const modalBase = "fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4";

export function ContactsClient({ initialContacts }: { initialContacts: Contact[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", phone: "", company: "", tags: "" });
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [workflows, setWorkflows] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [enrollWorkflowId, setEnrollWorkflowId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState<string | null>(null);
  const [activityEmail, setActivityEmail] = useState<string | null>(null);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (showEnroll && workflows.length === 0) {
      fetch("/api/workflows").then((r) => r.json()).then((data) => {
        setWorkflows(data.filter((w: { status: string }) => w.status === "ACTIVE"));
      });
    }
  }, [showEnroll, workflows.length]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    setSelected((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }

  async function handleEnroll() {
    if (!enrollWorkflowId) return;
    setEnrolling(true);
    setEnrollResult(null);
    const emails = contacts.filter((c) => selected.has(c.id)).map((c) => c.email);
    const res = await fetch(`/api/workflows/${enrollWorkflowId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails }),
    });
    const data = await res.json();
    setEnrolling(false);
    if (res.ok) {
      setEnrollResult(`✓ ${data.enrolled} contact${data.enrolled !== 1 ? "s" : ""} enrolled`);
      setTimeout(() => { setShowEnroll(false); setSelected(new Set()); setEnrollResult(null); }, 1500);
    } else {
      setEnrollResult(`Error: ${data.error}`);
    }
  }

  const categories = [{ name: "All", count: contacts.length }];
  const categoryMap = contacts.reduce((map, contact) => {
    const tags = contact.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
    if (tags.length === 0) {
      map.set("Uncategorized", (map.get("Uncategorized") ?? 0) + 1);
    }
    for (const tag of tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
    return map;
  }, new Map<string, number>());

  for (const [name, count] of categoryMap.entries()) {
    categories.push({ name, count });
  }

  const categoryFiltered = selectedCategory === "All"
    ? contacts
    : selectedCategory === "Uncategorized"
    ? contacts.filter((c) => !c.tags?.trim())
    : contacts.filter((c) =>
        c.tags?.split(",").map((t) => t.trim().toLowerCase()).includes(selectedCategory.toLowerCase())
      );

  const filtered = categoryFiltered.filter(
    (c) =>
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.tags ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd() {
    setLoading(true);
    const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { router.refresh(); setShowAdd(false); setForm({ email: "", name: "", phone: "", company: "", tags: "" }); }
    setLoading(false);
  }

  async function handleImport() {
    setLoading(true);
    const lines = csvText.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((row) => {
      const vals = row.split(",").map((v) => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    });
    await fetch("/api/contacts/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contacts: rows }) });
    router.refresh(); setShowImport(false); setCsvText(""); setLoading(false);
  }

  async function handleDelete(id: string) {
    await fetch("/api/contacts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setContacts(contacts.filter((c) => c.id !== id));
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} contact${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkLoading(true);
    await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: Array.from(selected) }),
    });
    setContacts(contacts.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
    setBulkLoading(false);
  }

  async function handleBulkTag(action: "tag" | "untag") {
    if (!bulkTag.trim()) return;
    setBulkLoading(true);
    await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: Array.from(selected), tag: bulkTag.trim() }),
    });
    setBulkLoading(false);
    setShowBulkTag(false);
    setBulkTag("");
    setSelected(new Set());
    router.refresh();
  }

  const ModalClose = ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">CRM</p>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contacts</h1>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button onClick={() => setShowEnroll(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                </svg>
                Enroll {selected.size} in Workflow
              </button>
              <button onClick={() => setShowBulkTag(true)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                Tag
              </button>
              <button onClick={handleBulkDelete} disabled={bulkLoading}
                className="flex items-center gap-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                </svg>
                Delete {selected.size}
              </button>
            </>
          )}
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import CSV
          </button>
          <a href="/api/contacts/export" download className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </a>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:-translate-y-px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Contact
          </button>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className={modalBase}>
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add Contact</h2>
              <ModalClose onClose={() => setShowAdd(false)} />
            </div>
            <input placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
            <input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputCls} />
            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd} disabled={loading || !form.email} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                {loading ? "Adding..." : "Add Contact"}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className={modalBase}>
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Import CSV</h2>
              <ModalClose onClose={() => setShowImport(false)} />
            </div>
            <p className="text-sm text-slate-500">First row must be headers: <span className="font-mono text-slate-700">email, name, phone, company, tags</span></p>
            <textarea
              placeholder={"email,name,phone,company,tags\njohn@example.com,John Doe,,,newsletter"}
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className={`${inputCls} font-mono resize-none`}
            />
            <div className="flex gap-2">
              <button onClick={handleImport} disabled={loading || !csvText.trim()} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                {loading ? "Importing..." : "Import"}
              </button>
              <button onClick={() => setShowImport(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll in workflow modal */}
      {showEnroll && (
        <div className={modalBase}>
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Enroll in Workflow</h2>
              <ModalClose onClose={() => setShowEnroll(false)} />
            </div>
            <p className="text-sm text-slate-500">{selected.size} contact{selected.size !== 1 ? "s" : ""} selected</p>
            {workflows.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4">No active workflows found. Activate a workflow first.</p>
            ) : (
              <div className="space-y-2">
                {workflows.map((wf) => (
                  <button key={wf.id} onClick={() => setEnrollWorkflowId(wf.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${enrollWorkflowId === wf.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${enrollWorkflowId === wf.id ? "border-indigo-600" : "border-slate-300"}`}>
                      {enrollWorkflowId === wf.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{wf.name}</span>
                  </button>
                ))}
              </div>
            )}
            {enrollResult && (
              <p className={`text-sm font-medium ${enrollResult.startsWith("✓") ? "text-emerald-600" : "text-rose-500"}`}>{enrollResult}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleEnroll} disabled={enrolling || !enrollWorkflowId || workflows.length === 0}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                {enrolling ? "Enrolling..." : "Enroll Contacts"}
              </button>
              <button onClick={() => setShowEnroll(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk tag modal */}
      {showBulkTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Tag {selected.size} Contact{selected.size !== 1 ? "s" : ""}</h2>
              <ModalClose onClose={() => setShowBulkTag(false)} />
            </div>
            <input
              placeholder="Tag name (e.g. customer)"
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
              className={inputCls}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => handleBulkTag("tag")} disabled={bulkLoading || !bulkTag.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                {bulkLoading ? "Applying..." : "Add Tag"}
              </button>
              <button onClick={() => handleBulkTag("untag")} disabled={bulkLoading || !bulkTag.trim()}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium transition-all">
                Remove Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total contacts", value: contacts.length,                              color: "text-indigo-600" },
          { label: "With company",   value: contacts.filter((c) => c.company).length,     color: "text-violet-600" },
          { label: "Tagged",         value: contacts.filter((c) => c.tags).length,        color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 hover:shadow-sm transition-all">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                selectedCategory === category.name
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      )}
      {contacts.length > 0 && (
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
          />
        </div>
      )}

      {/* Empty state */}
      {contacts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="text-slate-800 font-semibold mb-1">No contacts yet</p>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Add contacts manually or import a CSV to get started.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all">
              Add Contact
            </button>
            <button onClick={() => setShowImport(true)} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
              Import CSV
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
          No contacts match &quot;{search}&quot;
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["", "Email", "Name", "Company", "Tags", ""].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left">
                    {i === 0 ? (
                      <input type="checkbox"
                        checked={filtered.length > 0 && filtered.every((c) => selected.has(c.id))}
                        onChange={() => toggleAll(filtered.map((c) => c.id))}
                        className="rounded border-slate-300" />
                    ) : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setActivityEmail(c.email)}>
                  <td className="px-5 py-3.5">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300" />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-700 text-xs">{c.email}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.name ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.company ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3.5">
                    {c.tags
                      ? c.tags.split(",").map((t) => (
                          <span key={t} className="inline-block mr-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 border border-indigo-100 text-indigo-600">
                            {t.trim()}
                          </span>
                        ))
                      : <span className="text-slate-300">—</span>}
                    {c.unsubscribed && (
                      <span className="inline-block ml-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-50 border border-rose-200 text-rose-500">unsub</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length < contacts.length && (
            <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
              Showing {filtered.length} of {contacts.length} contacts
            </div>
          )}
        </div>
      )}
      {activityEmail && <ActivityPanel email={activityEmail} onClose={() => setActivityEmail(null)} />}
    </div>
  );
}
