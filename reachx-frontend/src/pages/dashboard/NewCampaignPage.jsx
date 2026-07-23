import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";

function replaceTemplatePlaceholders(text, data) {
  return text.replace(/{{\s*(name|email|company)\s*}}/gi, (_, key) => {
    const value = data[key.toLowerCase()];
    return value != null ? String(value) : "";
  });
}

function isHtmlContent(text) {
  return /<[^>]+>/.test(text);
}

const STEPS = [{ n: 1, label: "Campaign Info" }, { n: 2, label: "Email Content" }, { n: 3, label: "Recipients" }];

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft");

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
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiGeneratedPrompt, setAiGeneratedPrompt] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [campaignId, setCampaignId] = useState(null);
  const [saveStatus, setSaveStatus] = useState(""); // "saving" | "saved" | ""
  const autoSaveTimer = useRef(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [pendingAsset, setPendingAsset] = useState(null); // { asset, linkUrl }
  const contentTextareaRef = useRef(null);

  // Load existing draft when ?draft=id is in the URL
  useEffect(() => {
    if (!draftId || draftLoaded) return;
    api.get(`/api/campaigns/${draftId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.status === "DRAFT") {
          setCampaignId(data.id);
          setName(data.name ?? "");
          setSubject(data.subject ?? "");
          setContent(data.content ?? "");
          if (data.attachments?.length)
            setAttachments(data.attachments.map((a) => ({ url: a.url, filename: a.filename, id: a.id })));
          const hasRecipients = data.recipients?.length > 0;
          if (hasRecipients)
            setRecipientInput(data.recipients.map((r) => r.email).join("\n"));
          // Resume at the furthest step the user had reached
          if (hasRecipients) {
            setStep(3);
          } else if (data.content?.trim()) {
            setStep(2);
          } else if (data.name?.trim() && data.subject?.trim()) {
            setStep(2);
          }
          setDraftLoaded(true);
        }
      })
      .catch(() => {});
  }, [draftId, draftLoaded]);

  // Auto-save draft when name/subject/content changes
  const autoSave = useCallback(async (updatedName, updatedSubject, updatedContent, cid) => {
    if (!updatedName.trim() && !updatedSubject.trim()) return;
    setSaveStatus("saving");
    try {
      if (cid) {
        await api.patch(`/api/campaigns/${cid}/edit`, { name: updatedName, subject: updatedSubject, content: updatedContent });
      } else {
        const res = await api.post("/api/campaigns/draft", { name: updatedName || "Draft", subject: updatedSubject, content: updatedContent });
        const data = await res.json();
        if (res.ok) setCampaignId(data.id);
      }
      setSaveStatus("saved");
    } catch {
      setSaveStatus("");
    }
  }, []);

  function scheduleAutoSave(n, s, c, cid) {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => autoSave(n, s, c, cid), 1500);
  }

  function handleNameChange(val) {
    setName(val);
    scheduleAutoSave(val, subject, content, campaignId);
  }

  function handleSubjectChange(val) {
    setSubject(val);
    scheduleAutoSave(name, val, content, campaignId);
  }

  function handleContentChange(val) {
    setContent(val);
    scheduleAutoSave(name, subject, val, campaignId);
  }

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
    try {
      if (campaignId) {
        // update draft campaign
        await api.patch(`/api/campaigns/${campaignId}/edit`, { name, subject, content });
        if (emails.length) await api.post(`/api/campaigns/${campaignId}/recipients`, { emails });
        navigate(`/dashboard/campaigns/${campaignId}`);
      } else {
        const res = await api.post("/api/campaigns", { name, subject, content, recipients: emails });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Failed to create campaign"); setLoading(false); return; }
        navigate(`/dashboard/campaigns/${data.id}`);
      }
    } catch (err) {
      setError("Failed to create campaign");
    }
  }

  async function uploadAttachment(file) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const token = localStorage.getItem("reachx_token");
      const base = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

      // Ensure a draft campaign exists to attach to
      let cid = campaignId;
      if (!cid) {
        const draftRes = await api.post("/api/campaigns/draft", { name: name || "Draft", subject: subject || "", content: content || "" });
        const draftData = await draftRes.json();
        if (!draftRes.ok) throw new Error(draftData.error || "Failed to create draft campaign");
        cid = draftData.id;
        setCampaignId(cid);
      }

      const res = await fetch(`${base}/api/campaigns/${cid}/attachments`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const item = { url: data.url, filename: data.filename ?? data.originalname, id: data.id };
      setAttachments((s) => [...s, item]);

    } catch (err) {
      console.error("Upload failed", err);
    }
    setUploading(false);
  }

  function removeAttachment(idx) {
    const att = attachments[idx];
    if (!att) return;
    if (campaignId && att.id) {
      // delete from server
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/campaigns/${campaignId}/attachments/${att.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("reachx_token")}` },
      }).catch(() => {});
    }
    setAttachments((s) => s.filter((_, i) => i !== idx));
  }

  async function generateTemplate() {
    if (!aiPrompt.trim()) {
      setAiError("Enter a prompt to generate the template");
      return;
    }

    setAiLoading(true);
    setAiError("");
    try {
      const res = await api.post("/api/campaigns/generate-template", { prompt: aiPrompt });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Failed to generate a template");
      } else {
        setSubject(data.subject ?? "");
        setContent(data.content ?? "");
        setAiGeneratedPrompt(aiPrompt);
        scheduleAutoSave(name, data.subject ?? subject, data.content ?? content, campaignId);
      }
    } catch (err) {
      setAiError("Unable to generate a template right now.");
    }
    setAiLoading(false);
  }

  async function openAssetPicker() {
    if (assets.length === 0) {
      const res = await api.get("/api/pixels");
      const data = await res.json();
      setAssets(data);
    }
    setAssetPickerOpen(true);
  }

  function insertAsset(asset, linkUrl = "") {
    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    let snippet;
    if (asset.type === "pixel") {
      const src = asset.trackUrl ?? `${BASE}/api/track?pid=${asset.id}&type=open`;
      snippet = `<img src="${src}" width="1" height="1" style="display:none" alt="" />`;
    } else {
      const img = `<img src="${asset.imageUrl}" alt="${asset.name}" style="max-width:100%;display:block" />`;
      snippet = linkUrl.trim() ? `<a href="${linkUrl.trim()}">${img}</a>` : img;
    }
    const el = contentTextareaRef.current;
    if (el) {
      const start = el.selectionStart ?? content.length;
      const end = el.selectionEnd ?? content.length;
      const newContent = content.slice(0, start) + snippet + content.slice(end);
      handleContentChange(newContent);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + snippet.length, start + snippet.length); }, 0);
    } else {
      handleContentChange(content + "\n" + snippet);
    }
    setAssetPickerOpen(false);
    setPendingAsset(null);
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
              {saveStatus === "saving" && <span className="text-xs text-slate-400">Saving...</span>}
              {saveStatus === "saved" && <span className="text-xs text-emerald-500">Draft saved</span>}
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
                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Campaign name</label><input placeholder="e.g. April Newsletter" value={name} onChange={(e) => handleNameChange(e.target.value)} className={inputCls} /></div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Subject line</label>
                  <input placeholder="e.g. Here's what's new this month" value={subject} onChange={(e) => handleSubjectChange(e.target.value)} className={inputCls} />
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
                <div className="space-y-4">
                  <div className="grid gap-3 items-start grid-cols-[minmax(0,1fr)_auto]">
                    <div className="space-y-2 w-full">
                      <label className="text-sm font-medium text-slate-700">Generate email template</label>
                      <p className="text-xs text-slate-400">Tell the system the email focus and it will generate subject and body content.</p>
                      <div className="grid gap-3 items-start grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="e.g. follow-up after product demo"
                          className={inputCls}
                        />
                        <div className="flex items-start">
                          <button
                            type="button"
                            onClick={generateTemplate}
                            disabled={aiLoading || !aiPrompt.trim()}
                            className="w-auto px-3 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {aiLoading ? "Generating..." : "Generate"}
                          </button>
                        </div>
                      </div>
                      {aiError && <p className="text-sm text-rose-600">{aiError}</p>}
                    </div>
                  </div>
                  {aiGeneratedPrompt && (
                    <p className="text-xs text-slate-500">Generated from prompt: <span className="font-medium text-slate-700">{aiGeneratedPrompt}</span></p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Email body</label>
                      <button type="button" onClick={openAssetPicker} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg px-2.5 py-1.5 transition-all">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Insert pixel / image
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">HTML or plain text. Use {`{{name}}`}, {`{{email}}`}, {`{{company}}`} as placeholders.</p>
                    <textarea ref={contentTextareaRef} placeholder={"<p>Hello {{name}},</p>\n<p>Here's your update...</p>"} value={content} onChange={(e) => handleContentChange(e.target.value)} rows={14} className={`${inputCls} font-mono resize-none`} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Preview</p>
                        <p className="text-xs text-slate-400">John Doe · Acme Corp</p>
                      </div>
                      {content.trim() && (
                        <button onClick={() => setPreviewModal(true)} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg px-2.5 py-1.5 transition-all">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                          Full preview
                        </button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden h-[300px]">
                      {content.trim() ? (
                        isHtmlContent(content) ? (
                          <iframe
                            srcDoc={replaceTemplatePlaceholders(content, { name: "John Doe", email: "john.doe@example.com", company: "Acme Corp" })}
                            sandbox="allow-same-origin"
                            className="w-full h-full border-0 bg-white"
                            title="Email preview"
                          />
                        ) : (
                          <pre className="text-slate-700 max-w-none whitespace-pre-wrap break-words p-4 text-sm">
                            {replaceTemplatePlaceholders(content, { name: "John Doe", email: "john.doe@example.com", company: "Acme Corp" })}
                          </pre>
                        )
                      ) : (
                        <p className="text-sm text-slate-400 p-4">Paste your email HTML or plain text here to preview it with example data.</p>
                      )}
                    </div>
                    <div className="mt-3">
                      <label className="text-sm font-medium text-slate-700">Attachments</label>
                      <p className="text-xs text-slate-400">Upload files to include links to them in the email.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <input type="file" onChange={(e) => uploadAttachment(e.target.files?.[0])} className="text-sm" />
                        <button disabled={uploading} onClick={() => { /* noop: file input auto-uploads */ }} className="px-3 py-1 rounded-lg text-sm border border-slate-200 text-slate-600">Upload</button>
                      </div>
                      {attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {attachments.map((a, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-2">
                              <div className="truncate">
                                <a href={a.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-700 hover:underline">{a.filename}</a>
                                <div className="text-xs text-slate-400">{a.url}</div>
                              </div>
                              <div>
                                <button onClick={() => removeAttachment(i)} className="text-xs text-rose-600 px-2 py-1">Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
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

      {/* Asset picker modal */}
      {assetPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-md max-h-[80vh]">
            {/* Step 2: image selected — ask for link URL */}
            {pendingAsset ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPendingAsset(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <p className="text-sm font-semibold text-slate-800">Add a link to this image</p>
                  </div>
                  <button onClick={() => { setAssetPickerOpen(false); setPendingAsset(null); }} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <img src={pendingAsset.asset.imageUrl} alt={pendingAsset.asset.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" onError={(e) => { e.target.style.display = "none"; }} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{pendingAsset.asset.name}</p>
                      <p className="text-xs text-slate-400">Image asset</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Link URL <span className="text-slate-400 font-normal">(optional)</span></label>
                    <p className="text-xs text-slate-400">When recipients click this image, they'll go to this URL. Leave blank for no link.</p>
                    <input
                      autoFocus
                      type="url"
                      placeholder="https://yourwebsite.com"
                      value={pendingAsset.linkUrl}
                      onChange={(e) => setPendingAsset({ ...pendingAsset, linkUrl: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") insertAsset(pendingAsset.asset, pendingAsset.linkUrl); }}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => insertAsset(pendingAsset.asset, pendingAsset.linkUrl)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                      {pendingAsset.linkUrl.trim() ? "Insert image with link" : "Insert image"}
                    </button>
                    <button onClick={() => setPendingAsset(null)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">Back</button>
                  </div>
                </div>
              </>
            ) : (
              /* Step 1: pick an asset */
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <p className="text-sm font-semibold text-slate-800">Insert Pixel / Image</p>
                  <button onClick={() => setAssetPickerOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  {assets.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <p className="text-slate-500 text-sm">No pixels or images yet.</p>
                      <a href="/dashboard/pixels" target="_blank" rel="noreferrer" className="text-indigo-600 text-sm hover:underline">Create one in Pixel Folder →</a>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {assets.map((asset) => (
                        <button key={asset.id}
                          onClick={() => {
                            if (asset.type === "pixel") {
                              insertAsset(asset); // pixels insert immediately, no link needed
                            } else {
                              setPendingAsset({ asset, linkUrl: "" }); // images go to step 2
                            }
                          }}
                          className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors text-left">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${asset.type === "pixel" ? "bg-violet-100" : "bg-sky-100"}`}>
                            {asset.type === "pixel" ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{asset.name}</p>
                            <p className="text-xs text-slate-400">{asset.type === "pixel" ? "Tracking pixel — invisible, fires on open" : "Image — click to add a link"}</p>
                          </div>
                          <span className="text-xs text-indigo-600 shrink-0">{asset.type === "pixel" ? "Insert →" : "Next →"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full-screen preview modal */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-sm font-semibold text-slate-800">Email Preview</p>
                <p className="text-xs text-slate-400 mt-0.5">John Doe · john.doe@example.com · Acme Corp</p>
              </div>
              <button onClick={() => setPreviewModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
              <p className="text-xs text-slate-400">Subject</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{replaceTemplatePlaceholders(subject, { name: "John Doe", email: "john.doe@example.com", company: "Acme Corp" })}</p>
            </div>
            <div className="flex-1 min-h-0">
              {isHtmlContent(content) ? (
                <iframe
                  srcDoc={replaceTemplatePlaceholders(content, { name: "John Doe", email: "john.doe@example.com", company: "Acme Corp" })}
                  sandbox="allow-same-origin"
                  className="w-full h-full border-0 bg-white rounded-b-2xl"
                  title="Email preview full"
                />
              ) : (
                <div className="overflow-auto h-full p-6">
                  <pre className="text-slate-700 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {replaceTemplatePlaceholders(content, { name: "John Doe", email: "john.doe@example.com", company: "Acme Corp" })}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
