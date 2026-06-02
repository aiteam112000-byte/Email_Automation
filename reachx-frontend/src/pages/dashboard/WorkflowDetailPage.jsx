import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  MarkerType, Panel, Handle, Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const STATUS_STYLE = {
  DRAFT:    "text-slate-500 bg-slate-100 border-slate-200",
  ACTIVE:   "text-emerald-600 bg-emerald-50 border-emerald-200",
  INACTIVE: "text-amber-600 bg-amber-50 border-amber-200",
};

const STEP_META = {
  TRIGGER:      { border: "#86efac", text: "#16a34a", icon: "⚡", label: "Trigger" },
  SEND_EMAIL:   { border: "#93c5fd", text: "#2563eb", icon: "✉️", label: "Send Email" },
  WAIT:         { border: "#fde047", text: "#ca8a04", icon: "⏱", label: "Wait" },
  IF_CONDITION: { border: "#d8b4fe", text: "#7c3aed", icon: "⑂", label: "If / Else" },
  UPDATE_TAG:   { border: "#fdba74", text: "#ea580c", icon: "🏷", label: "Add Tag" },
  REMOVE_TAG:   { border: "#fca5a5", text: "#dc2626", icon: "✂️", label: "Remove Tag" },
  GO_TO:        { border: "#7dd3fc", text: "#0284c7", icon: "↩", label: "Go To" },
  END:          { border: "#cbd5e1", text: "#64748b", icon: "■", label: "End" },
};

const STEP_TYPES = Object.keys(STEP_META);
const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";

// ── Custom Node ──────────────────────────────────────────────────────────────
function StepNode({ data, selected }) {
  const m = STEP_META[data.type] ?? STEP_META.END;
  const isCondition = data.type === "IF_CONDITION";
  return (
    <div style={{
      background: "#fff", border: `2px solid ${selected ? "#6366f1" : m.border}`,
      borderRadius: 12, minWidth: 200, padding: "10px 16px",
      boxShadow: selected ? "0 0 0 3px #6366f120" : "0 2px 8px rgba(0,0,0,0.07)",
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: m.border, border: "2px solid #fff", width: 12, height: 12 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15 }}>{m.icon}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: m.text, textTransform: "uppercase", letterSpacing: 0.8 }}>{m.label}</div>
          {data.subtitle && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.subtitle}</div>}
        </div>
      </div>

      {/* IF_CONDITION: Yes (left) + No (right) handles */}
      {isCondition ? (
        <>
          <Handle id="yes" type="source" position={Position.Bottom} style={{ left: "30%", background: "#22c55e", border: "2px solid #fff", width: 12, height: 12 }} />
          <Handle id="no"  type="source" position={Position.Bottom} style={{ left: "70%", background: "#ef4444", border: "2px solid #fff", width: 12, height: 12 }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 4, borderTop: "1px dashed #e2e8f0" }}>
            <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>YES ↙</span>
            <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>↘ NO</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom}
          style={{ background: m.border, border: "2px solid #fff", width: 12, height: 12 }} />
      )}
    </div>
  );
}

const nodeTypes = { step: StepNode };

function stepsToFlow(steps) {
  const nodes = steps.map((s, i) => ({
    id: s.id, type: "step",
    position: { x: s.positionX ?? 300, y: s.positionY ?? i * 160 },
    data: {
      type: s.type,
      subtitle: s.config?.subject ?? s.config?.tag ?? s.config?.delayMinutes
        ? `${s.config.delayMinutes} ${s.config.unit ?? "min"}`
        : (s.notes ?? ""),
      config: s.config ?? {},
      notes: s.notes ?? "",
    },
  }));
  const edges = steps.filter((s) => s.parentId).map((s) => ({
    id: `e-${s.parentId}-${s.id}`,
    source: s.parentId,
    target: s.id,
    sourceHandle: s.branch === "yes" ? "yes" : s.branch === "no" ? "no" : null,
    label: s.branch ? (s.branch === "yes" ? "Yes" : "No") : "",
    markerEnd: { type: MarkerType.ArrowClosed, color: s.branch === "no" ? "#ef4444" : "#6366f1" },
    style: { stroke: s.branch === "no" ? "#ef4444" : s.branch === "yes" ? "#22c55e" : "#6366f1", strokeWidth: 2 },
    labelStyle: { fontSize: 10, fontWeight: 700, fill: s.branch === "no" ? "#ef4444" : "#22c55e" },
    labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
  }));
  return { nodes, edges };
}

// ── Config Panel ─────────────────────────────────────────────────────────────
function ConfigPanel({ node, steps, onClose, onSave, onDelete }) {
  const step = steps.find((s) => s.id === node.id);
  const [cfg, setCfg] = useState(step?.config ?? {});
  const [notes, setNotes] = useState(step?.notes ?? "");

  if (!step) return null;
  const m = STEP_META[step.type];

  function update(key, val) { setCfg((c) => ({ ...c, [key]: val })); }

  return (
    <div style={{ width: 300, background: "#fff", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{m.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{m.label}</span>
        </div>
        <button onClick={onClose} style={{ color: "#94a3b8", fontSize: 18, background: "none", border: "none", cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* TRIGGER config */}
        {step.type === "TRIGGER" && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Trigger type</label>
            <select value={cfg.triggerType ?? ""} onChange={(e) => update("triggerType", e.target.value)} className={inputCls} style={{ marginTop: 6 }}>
              <option value="">Select trigger...</option>
              <option value="MANUAL">Manual enrollment</option>
              <option value="CONTACT_CREATED">Contact created</option>
              <option value="TAG_ADDED">Tag added</option>
              <option value="CAMPAIGN_OPENED">Campaign opened</option>
              <option value="CAMPAIGN_CLICKED">Campaign clicked</option>
            </select>
            {(cfg.triggerType === "TAG_ADDED") && (
              <input className={inputCls} style={{ marginTop: 8 }} placeholder="Tag name" value={cfg.tag ?? ""} onChange={(e) => update("tag", e.target.value)} />
            )}
          </div>
        )}

        {/* SEND_EMAIL config */}
        {step.type === "SEND_EMAIL" && (
          <>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Subject</label>
              <input className={inputCls} style={{ marginTop: 6 }} placeholder="Email subject line" value={cfg.subject ?? ""} onChange={(e) => update("subject", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>From name</label>
              <input className={inputCls} style={{ marginTop: 6 }} placeholder="e.g. Sarah from Acme" value={cfg.fromName ?? ""} onChange={(e) => update("fromName", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Email body (HTML)</label>
              <textarea rows={8} className={inputCls} style={{ marginTop: 6, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
                placeholder="<p>Hello {{name}},</p>" value={cfg.body ?? ""} onChange={(e) => update("body", e.target.value)} />
            </div>
          </>
        )}

        {/* WAIT config */}
        {step.type === "WAIT" && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Wait duration</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input type="number" min={1} className={inputCls} style={{ flex: 1 }} placeholder="1" value={cfg.delayMinutes ?? ""} onChange={(e) => update("delayMinutes", parseInt(e.target.value))} />
              <select className={inputCls} style={{ flex: 1 }} value={cfg.unit ?? "minutes"} onChange={(e) => update("unit", e.target.value)}>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        )}

        {/* IF_CONDITION config */}
        {step.type === "IF_CONDITION" && (
          <>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Condition type</label>
              <select className={inputCls} style={{ marginTop: 6 }} value={cfg.conditionType ?? ""} onChange={(e) => update("conditionType", e.target.value)}>
                <option value="">Select condition...</option>
                <option value="email_opened">Email was opened</option>
                <option value="email_clicked">Email was clicked</option>
                <option value="has_tag">Contact has tag</option>
                <option value="not_tag">Contact does not have tag</option>
              </select>
            </div>
            {(cfg.conditionType === "has_tag" || cfg.conditionType === "not_tag") && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Tag name</label>
                <input className={inputCls} style={{ marginTop: 6 }} placeholder="Tag name" value={cfg.tag ?? ""} onChange={(e) => update("tag", e.target.value)} />
              </div>
            )}
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#64748b" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#22c55e", fontWeight: 700 }}>YES →</span> drag from left handle</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}><span style={{ color: "#ef4444", fontWeight: 700 }}>NO →</span> drag from right handle</div>
            </div>
          </>
        )}

        {/* UPDATE_TAG / REMOVE_TAG config */}
        {(step.type === "UPDATE_TAG" || step.type === "REMOVE_TAG") && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Tag name</label>
            <input className={inputCls} style={{ marginTop: 6 }} placeholder="e.g. interested, cold-lead" value={cfg.tag ?? ""} onChange={(e) => update("tag", e.target.value)} />
          </div>
        )}

        {/* Notes for all */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Notes</label>
          <input className={inputCls} style={{ marginTop: 6 }} placeholder="Optional note for this step" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8 }}>
        <button onClick={() => onSave(step.id, cfg, notes)} style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Save step
        </button>
        <button onClick={() => onDelete(step.id)} style={{ background: "#fff1f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 10, padding: "9px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkflowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepType, setNewStepType] = useState("SEND_EMAIL");
  const [selectedNode, setSelectedNode] = useState(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollEmails, setEnrollEmails] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState("");

  async function load() {
    const [wfRes, stRes] = await Promise.all([api.get(`/api/workflows/${id}`), api.get(`/api/workflows/${id}/stats`)]);
    const wf = await wfRes.json();
    const st = await stRes.json();
    setWorkflow(wf);
    setSteps(wf.steps ?? []);
    const { nodes: n, edges: e } = stepsToFlow(wf.steps ?? []);
    setNodes(n); setEdges(e);
    setStats(st);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  const onConnect = useCallback((params) => {
    // Determine branch label from sourceHandle
    const branch = params.sourceHandle === "yes" ? "yes" : params.sourceHandle === "no" ? "no" : null;
    setEdges((eds) => addEdge({
      ...params,
      label: branch ? (branch === "yes" ? "Yes" : "No") : "",
      markerEnd: { type: MarkerType.ArrowClosed, color: branch === "no" ? "#ef4444" : "#6366f1" },
      style: { stroke: branch === "no" ? "#ef4444" : branch === "yes" ? "#22c55e" : "#6366f1", strokeWidth: 2 },
      labelStyle: { fontSize: 10, fontWeight: 700, fill: branch === "no" ? "#ef4444" : "#22c55e" },
      labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
    }, eds));
  }, [setEdges]);

  async function toggleStatus() {
    const s = workflow.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await api.patch(`/api/workflows/${id}`, { status: s });
    await load();
  }

  async function handleDelete() {
    if (!confirm("Delete this workflow?")) return;
    await api.delete(`/api/workflows/${id}`);
    navigate("/dashboard/workflows");
  }

  async function saveSteps() {
    setSaving(true);
    const updated = steps.map((s) => {
      const node = nodes.find((n) => n.id === s.id);
      const edge = edges.find((e) => e.target === s.id);
      return {
        ...s,
        positionX: node?.position.x ?? s.positionX ?? 300,
        positionY: node?.position.y ?? s.positionY ?? 0,
        parentId: edge?.source ?? s.parentId ?? null,
        branch: edge?.sourceHandle ?? s.branch ?? null,
      };
    });
    await api.put(`/api/workflows/${id}/steps`, { steps: updated });
    setSaving(false);
    await load();
  }

  function addStep() {
    const last = steps[steps.length - 1];
    const newId = `step-${Date.now()}`;
    const newStep = { id: newId, type: newStepType, config: {}, notes: "", positionX: 300, positionY: steps.length * 160, parentId: last?.id ?? null, branch: null, order: steps.length };
    setSteps((s) => [...s, newStep]);
    setNodes((nds) => [...nds, { id: newId, type: "step", position: { x: 300, y: steps.length * 160 }, data: { type: newStepType, subtitle: "", config: {} } }]);
    if (last) {
      setEdges((eds) => [...eds, { id: `e-${last.id}-${newId}`, source: last.id, target: newId, markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" }, style: { stroke: "#6366f1", strokeWidth: 2 } }]);
    }
    setShowAddStep(false);
  }

  function saveStepConfig(stepId, cfg, notes) {
    setSteps((ss) => ss.map((s) => s.id === stepId ? { ...s, config: cfg, notes } : s));
    setNodes((nds) => nds.map((n) => n.id === stepId ? { ...n, data: { ...n.data, config: cfg, notes, subtitle: cfg.subject ?? cfg.tag ?? (cfg.delayMinutes ? `${cfg.delayMinutes} ${cfg.unit ?? "min"}` : notes) } } : n));
    setSelectedNode(null);
  }

  function deleteStep(stepId) {
    setSteps((ss) => ss.filter((s) => s.id !== stepId));
    setNodes((nds) => nds.filter((n) => n.id !== stepId));
    setEdges((eds) => eds.filter((e) => e.source !== stepId && e.target !== stepId));
    setSelectedNode(null);
  }

  async function handleEnroll() {
    const emails = enrollEmails.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setEnrolling(true);
    const res = await api.post(`/api/workflows/${id}/enroll`, { emails });
    const data = await res.json();
    setEnrolling(false);
    if (res.ok) { setEnrollResult(`✓ ${data.enrolled} enrolled`); setEnrollEmails(""); }
    else setEnrollResult(`Error: ${data.error}`);
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex"><Sidebar /><main className="flex-1 flex items-center justify-center"><p className="text-slate-400">Loading...</p></main></div>;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/dashboard/workflows" style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none" }}>← Workflows</Link>
            <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 15 }}>{workflow.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLE[workflow.status]}`}>{workflow.status}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {stats && [{ l: "Enrolled", v: stats.total }, { l: "Active", v: stats.active }, { l: "Done", v: stats.completed }].map((s) => (
              <div key={s.l} style={{ textAlign: "center", marginRight: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.l}</div>
              </div>
            ))}
            <button onClick={() => setShowEnroll(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-600 border border-violet-200 hover:bg-violet-50 transition-all">Enroll</button>
            <button onClick={() => setShowAddStep(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all">+ Step</button>
            <button onClick={saveSteps} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 transition-all">{saving ? "Saving..." : "Save"}</button>
            <button onClick={toggleStatus} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${workflow.status === "ACTIVE" ? "text-amber-700 border-amber-200 hover:bg-amber-50" : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"}`}>
              {workflow.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 border border-rose-200 hover:bg-rose-50 transition-all">Delete</button>
          </div>
        </div>

        {/* Canvas + panel */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1 }}>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNode(node)}
              onPaneClick={() => setSelectedNode(null)}
              nodeTypes={nodeTypes}
              fitView fitViewOptions={{ padding: 0.3 }}
            >
              <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={24} size={1.5} />
              <Controls />
              <MiniMap nodeColor={(n) => STEP_META[n.data?.type]?.border ?? "#6366f1"} style={{ background: "#fff", border: "1px solid #e2e8f0" }} />
              {nodes.length === 0 && (
                <Panel position="top-center">
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 24px", textAlign: "center", marginTop: 40, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>No steps yet</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Click "+ Step" to start building</div>
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>

          {/* Config panel */}
          {selectedNode && (
            <ConfigPanel
              node={selectedNode} steps={steps}
              onClose={() => setSelectedNode(null)}
              onSave={saveStepConfig}
              onDelete={deleteStep}
            />
          )}
        </div>
      </div>

      {/* Add Step modal */}
      {showAddStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add Step</h2>
              <button onClick={() => setShowAddStep(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {STEP_TYPES.map((type) => {
                const m = STEP_META[type];
                return (
                  <button key={type} onClick={() => setNewStepType(type)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${newStepType === type ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <span>{m.icon}</span>
                    <span className="text-sm font-medium text-slate-800">{m.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addStep} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">Add to Canvas</button>
              <button onClick={() => setShowAddStep(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll modal */}
      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Enroll Contacts</h2>
              <button onClick={() => setShowEnroll(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <textarea placeholder={"john@example.com\njane@company.com"} rows={5} value={enrollEmails} onChange={(e) => setEnrollEmails(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" />
            {enrollResult && <p className={`text-sm font-medium ${enrollResult.startsWith("✓") ? "text-emerald-600" : "text-rose-500"}`}>{enrollResult}</p>}
            <div className="flex gap-2">
              <button onClick={handleEnroll} disabled={enrolling || !enrollEmails.trim()} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                {enrolling ? "Enrolling..." : "Enroll"}
              </button>
              <button onClick={() => setShowEnroll(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
