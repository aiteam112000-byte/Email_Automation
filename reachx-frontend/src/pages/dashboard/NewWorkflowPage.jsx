import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const TRIGGERS = [
  { value: "MANUAL",           label: "Manual",           desc: "Enroll contacts manually" },
  { value: "CONTACT_CREATED",  label: "Contact created",  desc: "When a new contact is added" },
  { value: "TAG_ADDED",        label: "Tag added",        desc: "When a tag is applied to a contact" },
  { value: "CAMPAIGN_OPENED",  label: "Campaign opened",  desc: "When a contact opens a campaign email" },
  { value: "CAMPAIGN_CLICKED", label: "Campaign clicked", desc: "When a contact clicks a link in a campaign" },
];

export default function NewWorkflowPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("MANUAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Workflow name is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/workflows", { name: name.trim(), triggerType: trigger });
      if (!res.ok) throw new Error("Failed to create workflow");
      const wf = await res.json();
      navigate(`/dashboard/workflows/${wf.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-lg space-y-6 shadow-sm">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">New</p>
            <h1 className="text-xl font-bold text-slate-900">Create Workflow</h1>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Workflow name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lead Follow-Up Sequence"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Trigger</label>
            <div className="space-y-2">
              {TRIGGERS.map((t) => (
                <button key={t.value} onClick={() => setTrigger(t.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${trigger === t.value ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${trigger === t.value ? "border-indigo-600" : "border-slate-300"}`}>
                    {trigger === t.value && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{t.label}</div>
                    <div className="text-xs text-slate-400">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => navigate(-1)} className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">Cancel</button>
            <button onClick={handleCreate} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
              {loading ? "Creating..." : "Create & Build →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
