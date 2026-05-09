import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { api, fetchAdminOverview, fetchAdminUsers } from "../../lib/api.js";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function AdminOverview() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [overview, usersData, geoData] = await Promise.all([
          fetchAdminOverview(),
          fetchAdminUsers({ limit: 8 }),
          api.get("/api/data/admin/geo").then((r) => r.data).catch(() => []),
        ]);
        setStats(overview || {});
        setUsers(Array.isArray(usersData) ? usersData : usersData?.rows || []);
        void geoData;
      } catch {
        // Will show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => ([
    { title: "Total Users", value: stats.totalUsers || 0, up: true },
    { title: "New Users (7d)", value: stats.newUsers7d || 0, up: true },
    { title: "Total Tx", value: stats.totalTransactions || 0, up: true },
    { title: "Active API Keys", value: stats.activeApiKeys || 0, up: false },
    { title: "Total Webhooks", value: stats.totalWebhooks || 0, up: true },
    { title: "MRR", value: stats.mrr || 0, up: true },
  ]), [stats]);
  const chainBreakdown = stats.chainBreakdown || [];
  const spark = Array.from({ length: 14 }, (_, i) => ({ x: i, y: Math.round((stats.totalTransactions || 0) / 20 + Math.random() * 30) }));

  return (
    <motion.section variants={container} initial="hidden" animate="show">
      <h1 className="text-xl font-semibold mb-6">Overview</h1>
      {loading ? <p className="mt-4 text-sm text-slate-400">Loading…</p> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => (
          <motion.div 
            key={m.title} 
            variants={item}
            whileHover={{ y: -4, borderColor: "rgba(59, 130, 246, 0.5)", backgroundColor: "rgba(15, 23, 42, 0.8)" }}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
          >
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{m.title}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-mono text-3xl font-bold text-slate-100">{m.value.toLocaleString()}</p>
              {m.up ? <ArrowUpRight className="h-5 w-5 text-emerald-400" /> : <ArrowDownRight className="h-5 w-5 text-amber-300" />}
            </div>
            <div className="mt-3 h-12">
              <ResponsiveContainer width="100%" height="100%"><AreaChart data={spark}><Area type="monotone" dataKey="y" stroke="#3B82F6" fill="#3B82F633" /></AreaChart></ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <motion.div variants={item} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 xl:col-span-2">
          <p className="mb-2 text-sm font-medium text-slate-300">User Distribution</p>
          <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: 260 }}>
            <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
              {({ geographies }) => geographies.map((geoItem) => (
                <Geography 
                  key={geoItem.rsmKey} 
                  geography={geoItem} 
                  fill="#1e293b" 
                  stroke="#0f172a" 
                  style={{
                    hover: { fill: "#3b82f6", outline: "none" },
                    default: { outline: "none", transition: "all 250ms" },
                    pressed: { outline: "none" }
                  }}
                />
              ))}
            </Geographies>
          </ComposableMap>
        </motion.div>
        <motion.div variants={item} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="mb-2 text-sm font-medium text-slate-300">Chains breakdown</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={chainBreakdown} dataKey="txCount" nameKey="chain" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {chainBreakdown.map((_, i) => <Cell key={i} fill={["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"][i % 5]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div variants={item} className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="mb-3 text-sm font-medium text-slate-300">Recent signups</p>
        <div className="space-y-2">
          {users.map((u) => (
            <motion.div 
              key={u._id || Math.random()} 
              whileHover={{ x: 4, backgroundColor: "rgba(30, 41, 59, 0.8)" }}
              className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-900/50 px-4 py-3 text-sm transition-colors cursor-default"
            >
              <span className="font-medium text-slate-200">{u.email}</span>
              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 capitalize">{u.authMethod || "email"}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
