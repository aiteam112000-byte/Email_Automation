import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";

function replaceTemplatePlaceholders(text, data) {
  return text.replace(/{{\s*(name|email|company)\s*}}/gi, (_, key) => {
    const value = data[key.toLowerCase()];
    return value != null ? String(value) : "";
  });
}

const STEPS = [{ n: 1, label: "Campaign Info" }, { n: 2, label: "Email Content" }, { n: 3, label: "Recipients" }];

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientMode, setRecipientMode] = useState("manual");
  const [segments, setSegments] = useState([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [segmentPreview, setSegmentPreview] = useState(null);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedEmails = recipientInput.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
  const recipientCount = recipientMode === "segment" ? (segmentPreview?.count ?? 0) : parsedEmails.length;
  const canNext = step === 1 ? (name.trim() && subject.trim()) : step === 2 ? content.trim() : recipientCount > 0;

  async function loadSegments() {
    if (segments.length > 0) return;
    const res = await api.get("/api/segments");
    setSegments(await res.json());
  }

  async function previewSegment(segId) {
    if (!segId) { setSegmentPreview(null); return; }
    setSegmentLoading(true);
    const res = await api.get(`/api/segments/${segId}/contacts`);
    const data = await res.json();
    setSegmentPreview({ count: data.count, emails: data.contacts.map((c) => c.email) });
    setSegmentLoading(false);
  }

  async function handleSubmit() {
    const emails = recipientMode === "segment" ? (segmentPreview?.emails ?? []) : parsedEmails;
    if (!emails.length) { setError("Add at least one recipient"); return; }
    setLoading(true);
    setError("");
    const res = await api.post("/api/campaigns", { name, subject, content, recipients: emails });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to create campaign"); setLoading(false); }
    else navigate(`/dashboard/campaigns/${data.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-8 flex items-center">
            {STEPS.map((s, i) => {
              const done = step > s.n;
              const active = step === s.n;
              return (
                <div key={s.n} className="flex items-center">
                  <button onClick={() => done && setStep(s.n)}
                    className={`flex items-center gap-2.5 px-5 py-4 text-sm font-medium transition-colors border-b-2 ${active ? "text-indigo-700 border-indigo-500" : done ? "text-slate-500 border-transparent hover:text-slate-800 cursor-pointer" : "text-slate-400 border-transparent cursor-default"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${active ? "bg-indigo-600 text-white" : done ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400"}`}>
                      {done ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : s.n}
                    </span>
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-200 mx-1" />}
                </div>
              );
            })}
            <div className="ml-auto flex items-center gap-2 py-3">
              {step > 1 && <button onClick={() => setStep(step - 1)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">Previous</button>}
              {step < 3 ? (
                <button onClick={() => canNext && setStep(step + 1)} disabled={!canNext} className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">Next Step →</button>
              ) : (
                <button onClick={handleSubmit} disabled={loading || !canNext} className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">
                  {loading ? "Creating..." : "Create Campaign →"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-10 space-y-6">
          <Link to="/dashboard/campaigns" className="text-slate-400 hover:text-slate-700 transition-colors text-sm">← Campaigns</Link>

          {step === 1 && (
            <div className="space-y-6">
              <div><h1 className="text-xl font-bold text-slate-900 tracking-tight">Campaign Info</h1><p className="text-slate-400 text-sm mt-1">Give your campaign a name and subject line.</p></div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Campaign name</label><input placeholder="e.g. April Newsletter" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Subject line</label>
                  <input placeholder="e.g. Here's what's new this month" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
                  {subject && <p className="text-xs text-slate-400">{subject.length} characters · {subject.length <= 50 ? "Good length" : subject.length <= 70 ? "A bit long" : "Too long"}</p>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div><h1 className="text-xl font-bold text-slate-900 tracking-tight">Email Content</h1><p className="text-slate-400 text-sm mt-1">Write your email body — HTML or plain text.</p></div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <span className="text-xs text-slate-400 w-16 shrink-0">Subject:</span>
                  <span className="text-sm text-slate-700 font-medium">{subject}</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Email body</label>
                    <p className="text-xs text-slate-400">HTML or plain text. Use {`{{name}}`}, {`{{email}}`}, {`{{company}}`} as placeholders.</p>
                    <textarea placeholder={"<p>Hello {{name}},</p>\n<p>Here's your update...</p>"} value={content} onChange={(e) => setContent(e.target.value)} rows={14} className={`${inputCls} font-mono resize-none`} />
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Preview</p>
                      <p className="text-xs text-slate-400">John Doe · Acme Corp</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-[409px] overflow-auto">
                      {content.trim() ? (
                        <div className="text-slate-700 prose prose-sm prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: replaceTemplatePlaceholders(content.replace(/\n/g, "<br/>"), { name: "John Doe", email: "john.doe@example.com", company: "Acme Corp" }) }} />
                      ) : (
                        <p className="text-sm text-slate-400">Paste your email HTML or plain text here to preview it with example data.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div><h1 className="text-xl font-bold text-slate-900 tracking-tight">Recipients</h1><p className="text-slate-400 text-sm mt-1">Paste emails manually or use a saved segment.</p></div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {["manual", "segment"].map((m) => (
                  <button key={m} onClick={() => { setRecipientMode(m); if (m === "segment") loadSegments(); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${recipientMode === m ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    {m === "manual" ? "Manual" : "Use Segment"}
                  </button>
                ))}
              </div>

              {recipientMode === "manual" ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Email addresses</label>
                    <p className="text-xs text-slate-400">One per line or comma-separated</p>
                    <textarea placeholder={"john@example.com\njane@company.com"} value={recipientInput} onChange={(e) => setRecipientInput(e.target.value)} rows={8} className={`${inputCls} font-mono resize-none`} />
                  </div>
                  {parsedEmails.length > 0 && <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3"><span className="text-sm font-medium text-indigo-700">{parsedEmails.length} recipient{parsedEmails.length !== 1 ? "s" : ""} detected</span></div>}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  {segments.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <p className="text-slate-500 text-sm">No segments yet.</p>
                      <Link to="/dashboard/segments" className="text-indigo-600 text-sm hover:underline">Create a segment →</Link>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {segments.map((seg) => (
                          <button key={seg.id} onClick={() => { setSelectedSegmentId(seg.id); previewSegment(seg.id); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${selectedSegmentId === seg.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedSegmentId === seg.id ? "border-indigo-600" : "border-slate-300"}`}>
                              {selectedSegmentId === seg.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800">{seg.name}</div>
                              <div className="text-xs text-slate-400 capitalize">{seg.filterType === "manual" ? "Uploaded list" : `${seg.filterType}${seg.filterValue ? `: ${seg.filterValue}` : ""}`}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                      {segmentLoading && <p className="text-xs text-slate-400">Loading preview...</p>}
                      {segmentPreview && !segmentLoading && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                          <p className="text-sm font-medium text-indigo-700">{segmentPreview.count} matching contact{segmentPreview.count !== 1 ? "s" : ""}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Campaign summary</p>
                {[{ label: "Name", value: name }, { label: "Subject", value: subject }, { label: "Recipients", value: recipientCount > 0 ? `${recipientCount} address${recipientCount !== 1 ? "es" : ""}` : "None selected" }].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{row.label}</span>
                    <span className="text-slate-700 font-medium truncate max-w-xs text-right">{row.value}</span>
                  </div>
                ))}
              </div>

              {error && <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
