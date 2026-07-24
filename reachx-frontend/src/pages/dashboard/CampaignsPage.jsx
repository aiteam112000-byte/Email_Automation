import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import ErrorBoundary from "../../components/ErrorBoundary";
import { api } from "../../lib/api";

const STATUS_STYLE = {
  DRAFT:     "text-slate-500 bg-slate-100 border-slate-200",
  SCHEDULED: "text-amber-600 bg-amber-50 border-amber-200",
  SENDING:   "text-amber-600 bg-amber-50 border-amber-200",
  SENT:      "text-emerald-600 bg-emerald-50 border-emerald-200",
  FAILED:    "text-rose-600 bg-rose-50 border-rose-200",
};

const cnt = (events, type) => (events ?? []).filter((e) => e.eventType === type).length;

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => { api.get("/api/campaigns").then((r) => r.json()).then(setCampaigns); }, []);

  function toggleOne(id) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleAll() {
    const displayed = campaigns.filter((c) => filterStatus === "ALL" || c.status === filterStatus);
    setSelected((prev) => prev.size === displayed.length ? new Set() : new Set(displayed.map((c) => c.id)));
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} campaign${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all(Array.from(selected).map((id) => api.delete(`/api/campaigns/${id}/delete`)));
    setCampaigns((prev) => prev.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
    setDeleting(false);
  }

  async function handleExportCampaign(id, name) {
    const res = await api.raw(`/api/campaigns/${id}/export`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(name || "campaign").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "campaign"}-report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-7">
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">Email</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Campaigns</h1>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button onClick={handleBulkDelete} disabled={deleting}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
                  {deleting ? "Deleting..." : `Delete ${selected.size}`}
                </button>
              )}
              <Link to="/dashboard/campaigns/new">
                <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:-translate-y-px">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Campaign
                </button>
              </Link>
            </div>
          </div>

          {campaigns.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total",  value: campaigns.length,                                      color: "text-slate-800" },
                { label: "Draft",  value: campaigns.filter((c) => c.status === "DRAFT").length,  color: "text-slate-500" },
                { label: "Sent",   value: campaigns.filter((c) => c.status === "SENT").length,   color: "text-emerald-600" },
                { label: "Failed", value: campaigns.filter((c) => c.status === "FAILED").length, color: "text-rose-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:shadow-sm transition-all">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {campaigns.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center">
              <p className="text-slate-700 font-semibold mb-1">No campaigns yet</p>
              <p className="text-slate-400 text-sm mb-5">Create your first campaign to start sending.</p>
              <Link to="/dashboard/campaigns/new"><button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all">Create campaign →</button></Link>
            </div>
          ) : (
            <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {["ALL", "DRAFT", "SCHEDULED", "SENT", "FAILED"].map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'} border ${filterStatus === s ? 'border-indigo-600' : 'border-slate-100'}`}>
                    {s === 'ALL' ? 'All' : s[0] + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-500">Showing {campaigns.filter((c) => filterStatus === 'ALL' || c.status === filterStatus).length} campaigns</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 w-10">
                      <input type="checkbox" checked={selected.size === campaigns.filter((c) => filterStatus === 'ALL' || c.status === filterStatus).length && campaigns.filter((c) => filterStatus === 'ALL' || c.status === filterStatus).length > 0} onChange={toggleAll} className="rounded border-slate-300 cursor-pointer" />
                    </th>
                    {[
                      { label: "Campaign", align: "text-left" },
                      { label: "Status", align: "text-center" },
                      { label: "Recipients", align: "text-right" },
                      { label: "Sent", align: "text-right" },
                      { label: "Opened", align: "text-right" },
                      { label: "Clicked", align: "text-right" },
                      { label: "Actions", align: "text-right" },
                    ].map((h) => (
                      <th key={h.label} className={`px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${h.align}`}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.filter((c) => filterStatus === 'ALL' || c.status === filterStatus).map((c) => {
                    const sent = cnt(c.events, "SENT");
                    const opened = cnt(c.events, "OPENED");
                    const clicked = cnt(c.events, "CLICKED");
                    const isSelected = selected.has(c.id);
                    return (
                      <tr key={c.id} className={`transition-colors group ${isSelected ? "bg-rose-50" : "hover:bg-slate-50"}`}>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(c.id)} className="rounded border-slate-300 cursor-pointer" />
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            to={c.status === "DRAFT" ? `/dashboard/campaigns/new?draft=${c.id}` : `/dashboard/campaigns/${c.id}`}
                            className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors"
                          >{c.name}</Link>
                          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.subject}</div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block text-[11px] px-2.5 py-1 rounded-full font-semibold border ${STATUS_STYLE[c.status] ?? ""}`}>{c.status}</span>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-500">{c._count?.recipients ?? 0}</td>
                        <td className="px-5 py-4 text-right text-slate-500">{sent}</td>
                        <td className="px-5 py-4 text-right text-slate-500">{opened}{sent > 0 && <span className="text-slate-300 text-xs ml-1">({((opened / sent) * 100).toFixed(0)}%)</span>}</td>
                        <td className="px-5 py-4 text-right text-slate-500">{clicked}{sent > 0 && <span className="text-slate-300 text-xs ml-1">({((clicked / sent) * 100).toFixed(0)}%)</span>}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => handleExportCampaign(c.id, c.name)} title="Export CSV" className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Export
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}
