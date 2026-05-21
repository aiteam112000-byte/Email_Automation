import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const STATUS_STYLE = {
  DRAFT:    "text-slate-500 bg-slate-100 border-slate-200",
  ACTIVE:   "text-emerald-600 bg-emerald-50 border-emerald-200",
  INACTIVE: "text-amber-600 bg-amber-50 border-amber-200",
};

const TRIGGER_LABEL = {
  MANUAL: "Manual", CONTACT_CREATED: "Contact created",
  TAG_ADDED: "Tag added", CAMPAIGN_OPENED: "Campaign opened", CAMPAIGN_CLICKED: "Campaign clicked",
};

const TEMPLATES = [
  { id: "welcome-series", name: "Welcome Series", desc: "3-email onboarding sequence", icon: "👋" },
  { id: "re-engagement",  name: "Re-engagement",  desc: "Win back inactive contacts",  icon: "🔄" },
  { id: "lead-nurture",   name: "Lead Nurture",    desc: "Educate and qualify leads",   icon: "🌱" },
];

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => { api.get("/api/workflows").then((r) => r.json()).then(setWorkflows); }, []);

  const visible = workflows.filter((w) => showArchived ? w.archived : !w.archived);

  async function duplicate(id) {
    setLoadingId(id);
    const res = await api.post(`/api/workflows/${id}/duplicate`);
    const copy = await res.json();
    setLoadingId(null);
    navigate(`/dashboard/workflows/${copy.id}`);
  }

  async function toggleArchive(id) {
    setLoadingId(id);
    const res = await api.post(`/api/workflows/${id}/archive`);
    const updated = await res.json();
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, archived: updated.archived } : w));
    setLoadingId(null);
  }

  async function createFromTemplate(templateId) {
    setLoadingId(templateId);
    const res = await api.post("/api/workflows/templates", { templateId });
    const wf = await res.json();
    setLoadingId(null);
    navigate(`/dashboard/workflows/${wf.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-7">
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">Automation</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workflows</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTemplates((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${showTemplates ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                📋 Templates
              </button>
              <button onClick={() => setShowArchived((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${showArchived ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {showArchived ? "Show Active" : "Archived"}
              </button>
              <Link to="/dashboard/workflows/new">
                <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:-translate-y-px">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Workflow
                </button>
              </Link>
            </div>
          </div>

          {showTemplates && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start from a template</p>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => createFromTemplate(t.id)} disabled={loadingId === t.id}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-left transition-all disabled:opacity-60">
                    <span className="text-2xl">{t.icon}</span>
                    <div><div className="text-sm font-semibold text-slate-800">{t.name}</div><div className="text-xs text-slate-400 mt-0.5">{t.desc}</div></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {visible.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center">
              <p className="text-slate-700 font-semibold mb-1">{showArchived ? "No archived workflows" : "No workflows yet"}</p>
              <p className="text-slate-400 text-sm mb-5">{showArchived ? "Archived workflows will appear here." : "Build automated email sequences triggered by contact behavior."}</p>
              {!showArchived && <Link to="/dashboard/workflows/new"><button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all">Create workflow →</button></Link>}
            </div>
          ) : (
            <div className="grid gap-3">
              {visible.map((wf) => (
                <div key={wf.id} className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm rounded-2xl px-5 py-4 flex items-center gap-4 transition-all group">
                  <Link to={`/dashboard/workflows/${wf.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600"><path d="M5 12h14"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v5"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors text-sm">{wf.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{TRIGGER_LABEL[wf.triggerType] ?? wf.triggerType}</div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                    <span>{wf._count?.steps ?? 0} steps</span>
                    <span>{wf._count?.enrollments ?? 0} enrolled</span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${STATUS_STYLE[wf.status]}`}>{wf.status}</span>
                    <button onClick={() => duplicate(wf.id)} disabled={loadingId === wf.id} title="Duplicate" className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button onClick={() => toggleArchive(wf.id)} disabled={loadingId === wf.id} title={wf.archived ? "Unarchive" : "Archive"} className="p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-50">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
