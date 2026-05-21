import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { api, getUser } from "../../lib/api";

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all";

export default function SettingsPage() {
  const user = getUser();
  const [form, setForm] = useState({ name: "", senderName: "", replyTo: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/api/settings").then((r) => r.json()).then((data) => {
      setForm({ name: data.name ?? "", senderName: data.senderName ?? "", replyTo: data.replyTo ?? "" });
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await api.patch("/api/settings", form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-7">
          <div className="pt-1">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">Account</p>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 py-10 text-center">Loading...</div>
          ) : (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profile</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Display name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input value={user?.email ?? ""} disabled className={inputCls + " opacity-50 cursor-not-allowed"} />
                  <p className="text-xs text-slate-400">Email cannot be changed.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sender profile</p>
                  <p className="text-xs text-slate-400 mt-1">These are used as defaults for all campaigns.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">From name</label>
                  <input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} placeholder="e.g. Sarah from Acme" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Reply-to email</label>
                  <input type="email" value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} placeholder="replies@yourcompany.com" className={inputCls} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">
                  {saving ? "Saving..." : "Save settings"}
                </button>
                {saved && <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Saved</span>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
