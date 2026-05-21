import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api, getUser } from "../../lib/api";

const STATUS_STYLE = {
  DRAFT:   "text-slate-500 bg-slate-100 border-slate-200",
  SENDING: "text-amber-600 bg-amber-50 border-amber-200",
  SENT:    "text-emerald-600 bg-emerald-50 border-emerald-200",
  FAILED:  "text-rose-600 bg-rose-50 border-rose-200",
};

const cnt = (events, type) => events.filter((e) => e.eventType === type).length;

export default function DashboardPage() {
  const user = getUser();
  const name = user?.name ?? user?.email?.split("@")[0] ?? "there";
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    api.get("/api/stats").then((r) => r.json()).then(setStats);
    api.get("/api/campaigns").then((r) => r.json()).then((data) => setCampaigns(data.slice(0, 5)));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-7">
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">Dashboard</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Good to see you, <span className="text-indigo-600">{name}</span></h1>
            </div>
            <Link to="/dashboard/campaigns/new">
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:-translate-y-px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Campaign
              </button>
            </Link>
          </div>

          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Campaigns",   value: String(stats.totalCampaigns),                    sub: "total created",         color: "text-indigo-600",  bar: "bg-indigo-500",  barW: Math.min(stats.totalCampaigns * 10, 100) },
                { label: "Emails Sent", value: stats.totalSent.toLocaleString(),                sub: "all time",              color: "text-sky-600",     bar: "bg-sky-500",     barW: Math.min(stats.totalSent, 100) },
                { label: "Open Rate",   value: stats.openRate  ? `${stats.openRate}%`  : "—",   sub: "avg. across campaigns", color: "text-violet-600",  bar: "bg-violet-500",  barW: stats.openRate  ? Math.min(parseFloat(stats.openRate),  100) : 0 },
                { label: "Click Rate",  value: stats.clickRate ? `${stats.clickRate}%` : "—",   sub: "avg. across campaigns", color: "text-emerald-600", bar: "bg-emerald-500", barW: stats.clickRate ? Math.min(parseFloat(stats.clickRate), 100) : 0 },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</span>
                  </div>
                  <div>
                    <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-400 mt-1">{s.sub}</div>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.bar} rounded-full stat-bar`} style={{ width: `${s.barW}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "New Campaign",    desc: "Create and send an email campaign", to: "/dashboard/campaigns/new", color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-100" },
              { title: "Validate Emails", desc: "Check a list before sending",       to: "/dashboard/validate",      color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { title: "View Analytics",  desc: "Deep dive into performance",        to: "/dashboard/analytics",     color: "text-violet-600",  bg: "bg-violet-50 border-violet-100" },
            ].map((a) => (
              <Link key={a.title} to={a.to} className="group flex items-center gap-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-4 transition-all hover:shadow-sm">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${a.bg} ${a.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{a.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{a.desc}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-slate-500 transition-all shrink-0"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Recent campaigns</p>
              <Link to="/dashboard/campaigns" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">View all →</Link>
            </div>
            {campaigns.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-14 text-center">
                <p className="text-slate-700 font-semibold mb-1">No campaigns yet</p>
                <p className="text-slate-400 text-sm mb-5">Create your first campaign to get started.</p>
                <Link to="/dashboard/campaigns/new"><button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all">Create campaign →</button></Link>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Campaign", "Status", "Recipients", "Sent", "Opened"].map((h, i) => (
                        <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-5 py-4">
                          <Link to={`/dashboard/campaigns/${c.id}`} className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors text-sm">{c.name}</Link>
                          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.subject}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-semibold border ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-slate-500">{c._count?.recipients ?? 0}</td>
                        <td className="px-5 py-4 text-right text-sm text-slate-500">{cnt(c.events ?? [], "SENT")}</td>
                        <td className="px-5 py-4 text-right text-sm text-slate-500">{cnt(c.events ?? [], "OPENED")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
