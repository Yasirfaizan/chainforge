import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { api } from "../../lib/api.js";

const TIERS = ["Free", "Dev", "Growth", "Scale", "Enterprise"];

export default function AdminBilling() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/api/data/admin/billing")
      .then((r) => setData(r.data?.rows || r.data || []))
      .catch(() => setData([]));
  }, []);

  const tierCounts = useMemo(() => {
    const base = Object.fromEntries(TIERS.map((t) => [t, 0]));
    for (const row of data) base[row.tier || "Free"] = (base[row.tier || "Free"] || 0) + 1;
    return TIERS.map((t) => ({ tier: t, customers: base[t] }));
  }, [data]);

  const mrrSeries = useMemo(() => (data.length ? data : Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, mrr: 0 }))), [data]);

  return (
    <section>
      <h1 className="text-xl font-semibold">Billing</h1>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tierCounts.map((t) => (
          <div key={t.tier} className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
            <p className="text-xs text-slate-400">{t.tier}</p>
            <p className="text-2xl font-bold">{t.customers}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/30 p-4">
        <p className="mb-2 text-sm text-slate-300">MRR Trend</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mrrSeries}>
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Area type="monotone" dataKey="mrr" stroke="#3B82F6" fill="#3B82F633" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

