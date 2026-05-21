import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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

const STEP_TYPES = ["TRIGGER", "SEND_EMAIL", "WAIT", "IF_CONDITION", "UPDATE_TAG", "REMOVE_TAG", "GO_TO", "END"];

export default function WorkflowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState([]);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepType, setNewStepType] = useState("SEND_EMAIL");
  const [enrollEmails, setEnrollEmails] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState("");

  async function load() {
    const [wfRes, statsRes] = await Promise.all([api.get(`/api/workflows/${id}`), api.get(`/api/workflows/${id}/stats`)]);
    const wf = await wfRes.json();
    const st = await statsRes.json();
    setWorkflow(wf);
    setSteps(wf.steps ?? []);
    setStats(st);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function toggleStatus() {
    const newStatus = workflow.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await api.patch(`/api/workflows/${id}`, { status: newStatus });
    await load();
  }

  async function handleDelete() {
    if (!confirm("Delete this workflow? This cannot be undone.")) return;
    await api.delete(`/api/workflows/${id}`);
    navigate("/dashboard/workflows");
  }

  async function saveSteps() {
    setSaving(true);
    await api.put(`/api/workflows/${id}/steps`, { steps });
    setSaving(false);
    await load();
  }

  function addStep() {
    const newStep = { id: `step-${Date.now()}`, type: newStepType, config: {}, order: steps.length, parentId: steps.length > 0 ? steps[steps.length - 1].id : null, branch: null };
    setSteps([...steps, newStep]);
    setShowAddStep(false);
  }

  function removeStep(stepId) {
    setSteps(steps.filter((s) => s.id !== stepId));
  }

  async function handleEnroll() {
    const emails = enrollEmails.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setEnrolling(true);
    const res = await api.post(`/api/workflows/${id}/enroll`, { emails });
    const data = await res.json();
    setEnrolling(false);
    if (res.ok) { setEnrollResult(`✓ ${data.enrolled} contact${data.enrolled !== 1 ? "s" : ""} enrolled`); setEnrollEmails(""); }
    else setEnrollResult(`Error: ${data.error}`);
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex"><Sidebar /><main className="flex-1 flex items-center justify-center"><p className="text-slate-400">Loading...</p></main></div>;
  if (!workflow) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8 space-y-7">
          <div className="flex items-start justify-between gap-4 pt-1">
            <div>
              <Link to="/dashboard/workflows" className="text-slate-400 hover:text-slate-700 text-sm transition-colors">← Workflows</Link>
              <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">{workflow.name}</h1>
              <p className="text-slate-400 text-sm mt-1">{TRIGGER_LABEL[workflow.triggerType] ?? workflow.triggerType}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${STATUS_STYLE[workflow.status]}`}>{workflow.status}</span>
              <button onClick={toggleStatus} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${workflow.status === "ACTIVE" ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>
                {workflow.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </button>
              <button onClick={handleDelete} className="text-xs text-slate-400 hover:text-rose-500 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 px-3 py-2 rounded-xl transition-all">Delete</button>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total enrolled", value: stats.total,          color: "text-slate-800" },
                { label: "Active",         value: stats.active,         color: "text-sky-600" },
                { label: "Completed",      value: stats.completed,      color: "text-emerald-600" },
                { label: "Completion",     value: `${stats.completionRate}%`, color: "text-violet-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Steps builder */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Workflow Steps</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddStep(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50">+ Add Step</button>
                <button onClick={saveSteps} disabled={saving} className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-all">
                  {saving ? "Saving..." : "Save Steps"}
                </button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {steps.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No steps yet. Add a step to build your workflow.</div>
              ) : steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center text-xs font-bold text-violet-600 shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">{step.type.replace(/_/g, " ")}</div>
                    {step.config?.subject && <div className="text-xs text-slate-400 mt-0.5">Subject: {step.config.subject}</div>}
                    {step.config?.delayMinutes && <div className="text-xs text-slate-400 mt-0.5">Wait: {step.config.delayMinutes} {step.config.unit ?? "minutes"}</div>}
                  </div>
                  <button onClick={() => removeStep(step.id)} className="text-xs text-slate-300 hover:text-rose-500 transition-colors">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Manual enroll */}
          {workflow.status === "ACTIVE" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Manual Enrollment</p>
              <textarea placeholder={"john@example.com\njane@company.com"} rows={4} value={enrollEmails} onChange={(e) => setEnrollEmails(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none transition-all" />
              {enrollResult && <p className={`text-sm font-medium ${enrollResult.startsWith("✓") ? "text-emerald-600" : "text-rose-500"}`}>{enrollResult}</p>}
              <button onClick={handleEnroll} disabled={enrolling || !enrollEmails.trim()} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
                {enrolling ? "Enrolling..." : "Enroll Contacts"}
              </button>
            </div>
          )}
        </div>
      </main>

      {showAddStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">Add Step</h2><button onClick={() => setShowAddStep(false)} className="text-slate-400 hover:text-slate-700">✕</button></div>
            <div className="space-y-2">
              {STEP_TYPES.map((type) => (
                <button key={type} onClick={() => setNewStepType(type)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${newStepType === type ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${newStepType === type ? "border-indigo-600" : "border-slate-300"}`}>
                    {newStepType === type && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </div>
                  <span className="text-sm font-medium text-slate-800">{type.replace(/_/g, " ")}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addStep} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">Add Step</button>
              <button onClick={() => setShowAddStep(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
