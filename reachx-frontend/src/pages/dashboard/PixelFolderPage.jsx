import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const inputCls =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";

export default function PixelFolderPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "pixel", imageUrl: "", imageSource: "url" });
  const [saving, setSaving] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [copied, setCopied] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", imageUrl: "" });
  const [statsId, setStatsId] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  async function load() {
    const res = await api.get("/api/pixels");
    const data = await res.json();
    setAssets(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.name.trim()) return;
    setSaving(true);
    await api.post("/api/pixels", {
      name: form.name.trim(),
      type: form.type,
      imageUrl: form.imageUrl.trim() || null,
    });
    setForm({ name: "", type: "pixel", imageUrl: "", imageSource: "url" });
    setUploadPreview(null);
    setShowAdd(false);
    setSaving(false);
    await load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this asset?")) return;
    await api.delete(`/api/pixels/${id}`);
    await load();
  }

  async function handleEdit(id) {
    await api.patch(`/api/pixels/${id}`, {
      name: editForm.name.trim(),
      imageUrl: editForm.imageUrl.trim() || null,
    });
    setEditId(null);
    await load();
  }

  async function loadStats(id) {
    setStatsId(id);
    setStats(null);
    setStatsLoading(true);
    const res = await api.get(`/api/pixels/${id}/stats`);
    const data = await res.json();
    setStats(data);
    setStatsLoading(false);
  }

  function getSnippet(asset) {
    if (asset.type === "pixel") {
      // Use trackUrl from backend (contains correct APP_URL/ngrok), fallback to BASE
      const src = asset.trackUrl ?? `${BASE}/api/track?pid=${asset.id}&type=open`;
      return `<img src="${src}" width="1" height="1" style="display:none" alt="" />`;
    }
    return `<img src="${asset.imageUrl}" alt="${asset.name}" style="max-width:100%" />`;
  }

  function copySnippet(asset) {
    navigator.clipboard.writeText(getSnippet(asset));
    setCopied(asset.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const pixels = assets.filter((a) => a.type === "pixel");
  const images = assets.filter((a) => a.type === "image");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-7">
          {/* Header */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">Assets</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pixel Folder</h1>
              <p className="text-sm text-slate-400 mt-1">Manage tracking pixels and images for your campaigns</p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Asset
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading...</div>
          ) : assets.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold text-sm">No assets yet</p>
              <p className="text-slate-400 text-xs mt-1">Add tracking pixels or images to use in your campaigns</p>
            </div>
          ) : (
            <>
              {/* Tracking Pixels */}
              {pixels.length > 0 && (
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Tracking Pixels</p>
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {pixels.map((asset) => (
                      <AssetRow
                        key={asset.id}
                        asset={asset}
                        snippet={getSnippet(asset)}
                        copied={copied === asset.id}
                        onCopy={() => copySnippet(asset)}
                        onDelete={() => handleDelete(asset.id)}
                        editId={editId}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        onEditStart={() => { setEditId(asset.id); setEditForm({ name: asset.name, imageUrl: asset.imageUrl ?? "" }); }}
                        onEditSave={() => handleEdit(asset.id)}
                        onEditCancel={() => setEditId(null)}
                        onStats={() => loadStats(asset.id)}
                        inputCls={inputCls}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Images */}
              {images.length > 0 && (
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Images</p>
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {images.map((asset) => (
                      <AssetRow
                        key={asset.id}
                        asset={asset}
                        snippet={getSnippet(asset)}
                        copied={copied === asset.id}
                        onCopy={() => copySnippet(asset)}
                        onDelete={() => handleDelete(asset.id)}
                        editId={editId}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        onEditStart={() => { setEditId(asset.id); setEditForm({ name: asset.name, imageUrl: asset.imageUrl ?? "" }); }}
                        onEditSave={() => handleEdit(asset.id)}
                        onEditCancel={() => setEditId(null)}
                        inputCls={inputCls}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add Asset Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add Asset</h2>
              <button onClick={() => { setShowAdd(false); setUploadPreview(null); }} className="text-slate-400 hover:text-slate-700">✕</button>            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</label>
              <div className="flex gap-2">
                {["pixel", "image"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${form.type === t ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    {t === "pixel" ? "Tracking Pixel" : "Image"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.type === "pixel" ? "e.g. Newsletter Open Tracker" : "e.g. Header Banner"}
                className={inputCls}
              />
            </div>

            {form.type === "image" && (
              <div className="space-y-2">
                {/* Source tabs */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                  {["url", "upload"].map((src) => (
                    <button
                      key={src}
                      onClick={() => { setForm({ ...form, imageSource: src, imageUrl: "" }); setUploadPreview(null); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${form.imageSource === src ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      {src === "url" ? "Paste URL" : "Upload File"}
                    </button>
                  ))}
                </div>

                {form.imageSource === "url" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Image URL</label>
                    <input
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.png"
                      className={inputCls}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upload Image</label>
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-all ${uploadPreview ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}>
                      {uploadPreview ? (
                        <img src={uploadPreview} alt="preview" className="max-h-28 rounded-lg object-contain" />
                      ) : (
                        <>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span className="text-xs text-slate-400">Click to choose an image</span>
                          <span className="text-[11px] text-slate-300">PNG, JPG, GIF, WebP</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // Show local preview immediately
                          const localUrl = URL.createObjectURL(file);
                          setUploadPreview(localUrl);
                          // Upload to backend
                          const fd = new FormData();
                          fd.append("file", file);
                          const token = localStorage.getItem("reachx_token");
                          const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
                          const res = await fetch(`${BASE}/api/pixels/upload`, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                            body: fd,
                          });
                          const data = await res.json();
                          setForm((f) => ({ ...f, imageUrl: data.url }));
                        }}
                      />
                    </label>
                    {uploadPreview && (
                      <button onClick={() => { setUploadPreview(null); setForm((f) => ({ ...f, imageUrl: "" })); }} className="text-xs text-slate-400 hover:text-rose-500 transition-colors">
                        Remove image
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {form.type === "pixel" && (
              <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                A 1×1 invisible tracking pixel will be generated. Copy its HTML snippet and paste it into your campaign email content.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={saving || !form.name.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                {saving ? "Saving..." : "Add Asset"}
              </button>
              <button onClick={() => { setShowAdd(false); setUploadPreview(null); }} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pixel Stats Modal */}
      {statsId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[80vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pixel Open Stats</h2>
                {stats && <p className="text-xs text-slate-400 mt-0.5">{stats.name}{stats.totalOpens} open{stats.totalOpens !== 1 ? "s" : ""}</p>}
              </div>
              <button onClick={() => { setStatsId(null); setStats(null); }} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {statsLoading ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
            ) : !stats || stats.opens.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No opens recorded yet for this pixel.</div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {stats.opens.map((o, i) => (
                  <div key={i} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{o.recipientEmail}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{o.campaignName}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">
                      {new Date(o.openedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetRow({ asset, snippet, copied, onCopy, onDelete, editId, editForm, setEditForm, onEditStart, onEditSave, onEditCancel, onStats, inputCls }) {
  const isEditing = editId === asset.id;
  const [editPreview, setEditPreview] = useState(null);
  const [editSource, setEditSource] = useState("url");

  return (
    <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
      {isEditing ? (
        <div className="space-y-2">
          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} placeholder="Name" />
          {asset.type === "image" && (
            <div className="space-y-2">
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                {["url", "upload"].map((src) => (
                  <button key={src} onClick={() => { setEditSource(src); setEditPreview(null); setEditForm({ ...editForm, imageUrl: "" }); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${editSource === src ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                    {src === "url" ? "Paste URL" : "Upload File"}
                  </button>
                ))}
              </div>
              {editSource === "url" ? (
                <input value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} className={inputCls} placeholder="https://example.com/image.png" />
              ) : (
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-5 cursor-pointer transition-all ${editPreview ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}>
                  {editPreview ? (
                    <img src={editPreview} alt="preview" className="max-h-20 rounded-lg object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">Click to choose an image</span>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setEditPreview(URL.createObjectURL(file));
                    const fd = new FormData();
                    fd.append("file", file);
                    const token = localStorage.getItem("reachx_token");
                    const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
                    const res = await fetch(`${BASE}/api/pixels/upload`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                      body: fd,
                    });
                    const data = await res.json();
                    setEditForm((f) => ({ ...f, imageUrl: data.url }));
                  }} />
                </label>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onEditSave} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all">Save</button>
            <button onClick={() => { onEditCancel(); setEditPreview(null); setEditSource("url"); }} className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg text-xs transition-all">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{asset.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${asset.type === "pixel" ? "text-violet-600 bg-violet-50 border-violet-200" : "text-sky-600 bg-sky-50 border-sky-200"}`}>
                {asset.type === "pixel" ? "Pixel" : "Image"}
              </span>
            </div>
            {asset.type === "image" && asset.imageUrl && (
              <div className="flex items-center gap-2">
                <img src={asset.imageUrl} alt={asset.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" onError={(e) => { e.target.style.display = "none"; }} />
                <p className="text-xs text-slate-400 truncate font-mono">{asset.imageUrl.startsWith("data:") ? "Uploaded image" : asset.imageUrl}</p>              </div>
            )}
            <div className="flex items-center gap-2">
              <code className="text-[11px] text-slate-500 bg-slate-100 rounded-lg px-2 py-1 truncate max-w-sm font-mono">{snippet}</code>
              <button
                onClick={onCopy}
                className={`shrink-0 text-xs px-2.5 py-1 rounded-lg border transition-all font-medium ${copied ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-slate-500 border-slate-200 hover:bg-slate-100"}`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {asset.type === "pixel" && (
              <button onClick={onStats} className="text-xs text-violet-500 hover:text-violet-700 border border-violet-200 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition-all font-medium">Stats</button>
            )}
            <button onClick={onEditStart} className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-all">Edit</button>
            <button onClick={onDelete} className="text-xs text-slate-400 hover:text-rose-500 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-all">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
