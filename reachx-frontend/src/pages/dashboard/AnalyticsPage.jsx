import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { api } from "../../lib/api";

const cnt = (events, type) => (events ?? []).filter((e) => e.eventType === type).length;

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => { api.get("/api/campaigns").then((r) => r.json()).then(setCampaigns); }, []);

  const totalSent    = campaigns.reduce((a, c) => a + cnt(c.events, "SENT"), 0);
  const totalOpened  = campaigns.reduce((a, c) => a + cnt(c.events, "OPENED"), 0);
  const totalClicked = campaigns.reduce((a, c) => a + cnt(c.events, "CLICKED"), 0);
  const totalBounced = campaigns.reduce((a, c) => a + cnt(c.events, "BOUNCED"), 0);

  const openRate   = totalSent > 0 ? ((totalOpened  / totalSent) * 100).toFixed(1) : null;
  const clickRate  = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : null;
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : null;

  const STATS = [
    { label: "Emails Sent",   value: totalSent.toLocaleString(),    sub: "all campaigns",                                color: "text-sky-600",     bar: "bg-sky-500",     barW: Math.min(totalSent, 100) },
    { label: "Total Opened",  value: totalOpened.toLocaleString(),  sub: openRate   ? `${openRate}% open rate`   : "—", color: "text-violet-600",  bar: "bg-violet-500",  barW: openRate   ? parseFloat(openRate)   : 0 },
    { label: "Total Clicked", value: totalClicked.toLocaleString(), sub: clickRate  ? `${clickRate}% click rate`  : "—",color: "text-emerald-600", bar: "bg-emerald-500", barW: clickRate  ? parseFloat(clickRate)  : 0 },
    { label: "Bounced",       value: totalBounced.toLocaleString(), sub: bounceRate ? `${bounceRate}% bounce rate` : "—",color: "text-rose-600",    bar: "bg-rose-500",    barW: bounceRate ? parseFloat(bounceRate) : 0 },
  ];

  const FUNNEL = [
    { label: "Sent",    value: totalSent,    pct: 100,                                                   color: "bg-sky-500" },
    { label: "Opened",  value: totalOpened,  pct: totalSent > 0 ? (totalOpened  / totalSent) * 100 : 0, color: "bg-violet-500" },
    { label: "Clicked", value: totalClicked, pct: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0, color: "bg-emerald-500" },
    { label: "Bounced", value: totalBounced, pct: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0, color: "bg-rose-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-7">
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mb-1">Reporting</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Analytics</h1>
            </div>
            <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} tracked</div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-slate-300 hover:shadow-sm transition-all">
                <div>
                  <div className={`text-3xl font-bold tracking-tight ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-medium text-slate-600 mt-1">{s.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.bar} rounded-full stat-bar`} style={{ width: `${Math.min(s.barW, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {totalSent > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-5">Email funnel</p>
              <div className="space-y-3">
                {FUNNEL.map((row) => (
                  <div key={row.label} className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 w-14 shrink-0">{row.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full stat-bar`} style={{ width: `${row.pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-10 text-right shrink-0">{row.value.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 w-12 text-right shrink-0">{row.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Per campaign</p>
            {campaigns.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">No campaign data yet.</div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Campaign", "Sent", "Open rate", "Click rate", "Bounces"].map((h, i) => (
                        <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((c) => {
                      const s = cnt(c.events, "SENT");
                      const o = cnt(c.events, "OPENED");
                      const cl = cnt(c.events, "CLICKED");
                      const b = cnt(c.events, "BOUNCED");
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 font-medium text-slate-800">{c.name}</td>
                          <td className="px-5 py-4 text-right text-slate-500">{s}</td>
                          <td className="px-5 py-4 text-right font-semibold text-violet-600">{s > 0 ? ((o / s) * 100).toFixed(1) + "%" : "—"}</td>
                          <td className="px-5 py-4 text-right font-semibold text-emerald-600">{s > 0 ? ((cl / s) * 100).toFixed(1) + "%" : "—"}</td>
                          <td className="px-5 py-4 text-right text-rose-500">{b}</td>
                        </tr>
                      );
                    })}
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
