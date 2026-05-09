import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import {
  Globe,
  Users,
  Activity,
  TrendingUp,
  KeyRound,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import {
  fetchAdminChainStats,
  fetchAdminChainVolume,
  fetchAdminChainGrowth,
  fetchAdminUserAcquisition,
  fetchAdminApiKeyUsage,
} from "../../lib/api.js";
import { CHAINS } from "../../constants/chains.js";

const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#f43f5e",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
];

function StatCard({ title, value, icon: Icon, color, note }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f131b] p-6 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          {note ? (
            <p className="mt-2 text-[11px] text-slate-500">{note}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0f131b] p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AdminChainStats() {
  const { data: chainStats, isLoading: loadingChainStats } = useQuery({
    queryKey: ["admin-chain-stats"],
    queryFn: fetchAdminChainStats,
    refetchInterval: 60000,
  });

  const { data: volumeData, isLoading: loadingVolume } = useQuery({
    queryKey: ["admin-chain-volume"],
    queryFn: () => fetchAdminChainVolume({ days: 30 }),
    refetchInterval: 60000,
  });

  const { data: growthData, isLoading: loadingGrowth } = useQuery({
    queryKey: ["admin-chain-growth"],
    queryFn: () => fetchAdminChainGrowth({ windowDays: 7 }),
    refetchInterval: 60000,
  });

  const { data: acquisitionData, isLoading: loadingAcquisition } = useQuery({
    queryKey: ["admin-user-acquisition"],
    queryFn: () => fetchAdminUserAcquisition({ days: 90, interval: "day" }),
    refetchInterval: 60000,
  });

  const { data: apiKeyUsageData, isLoading: loadingApiKeys } = useQuery({
    queryKey: ["admin-api-key-usage"],
    queryFn: () => fetchAdminApiKeyUsage({ days: 30, limit: 10 }),
    refetchInterval: 60000,
  });

  const chainCards = useMemo(() => {
    if (!chainStats) return [];
    return Object.entries(chainStats)
      .map(([chainId, data]) => {
        const chainInfo = CHAINS.find((c) => c.id === chainId);
        return {
          id: chainId,
          name: chainInfo?.name || chainId,
          users: data.users || 0,
          transactions: data.txs || 0,
        };
      })
      .sort((a, b) => b.transactions - a.transactions);
  }, [chainStats]);

  const totalUsers = chainCards.reduce((acc, item) => acc + item.users, 0);
  const totalTxs = chainCards.reduce((acc, item) => acc + item.transactions, 0);
  const totalVolume = (volumeData?.rows || []).reduce(
    (acc, item) => acc + Number(item.totalAmount || 0),
    0,
  );
  const topGrowth =
    (growthData?.rows || []).find(
      (row) => row.combinedGrowthScore != null || row.txGrowthPct != null,
    ) ||
    growthData?.rows?.[0] ||
    null;
  const totalApiCalls = (apiKeyUsageData?.rows || []).reduce(
    (acc, item) => acc + (item.total || 0),
    0,
  );

  const loading =
    loadingChainStats ||
    loadingVolume ||
    loadingGrowth ||
    loadingAcquisition ||
    loadingApiKeys;

  if (loading && !chainStats) {
    return (
      <div className="p-10 space-y-8 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-3xl" />
          ))}
        </div>
        <div className="h-96 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  return (
    <main className="p-6 md:p-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Multi-Chain Analytics
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Users, transactions, growth, acquisition, and API usage across chains.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
        <StatCard
          title="Total Users"
          value={totalUsers.toLocaleString()}
          icon={Users}
          color="bg-cyan-500"
          note="Users linked across chains"
        />
        <StatCard
          title="Total Transactions"
          value={totalTxs.toLocaleString()}
          icon={Activity}
          color="bg-violet-500"
          note="Count from on-chain history"
        />
        <StatCard
          title="30d Volume"
          value={totalVolume.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
          icon={Globe}
          color="bg-emerald-500"
          note="Summed amount field"
        />
        <StatCard
          title="Top Growth"
          value={topGrowth?.chain || "—"}
          icon={TrendingUp}
          color="bg-amber-500"
          note={
            topGrowth?.combinedGrowthScore != null
              ? `Score ${topGrowth.combinedGrowthScore} vs previous window`
              : topGrowth?.txGrowthPct != null
                ? `${topGrowth.txGrowthPct}% tx growth`
                : "No growth data yet"
          }
        />
        <StatCard
          title="API Calls"
          value={totalApiCalls.toLocaleString()}
          icon={KeyRound}
          color="bg-rose-500"
          note="API-key authenticated traffic"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card
          title="Transaction Volume by Chain"
          subtitle="Total transaction count and summed amount over the last 30 days"
        >
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={volumeData?.rows || []}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#ffffff08"
                />
                <XAxis
                  dataKey="chain"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#1e293b",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="txCount" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="User Acquisition" subtitle="Daily new users over time">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={acquisitionData?.series || []}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="acqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#3b82f6"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#ffffff08"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#1e293b",
                    borderRadius: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  fill="url(#acqGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Fastest Growing Chains"
          subtitle={`Growth over the last ${growthData?.windowDays || 7} days versus the previous window`}
        >
          <div className="space-y-3">
            {(growthData?.rows || []).slice(0, 8).map((row, index) => (
              <div
                key={row.chain}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs text-slate-300">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {row.chain}
                    </p>
                    <p className="text-xs text-slate-500">
                      Current: {row.currentTxs} | Previous: {row.previousTxs}
                    </p>
                  </div>
                </div>
                {(() => {
                  const growthValue =
                    row.combinedGrowthScore ??
                    row.txGrowthPct ??
                    row.userGrowthPct;
                  const growthLabel =
                    row.combinedGrowthScore != null
                      ? `${row.combinedGrowthScore > 0 ? "+" : ""}${row.combinedGrowthScore} score`
                      : growthValue == null
                        ? "New"
                        : `${growthValue > 0 ? "+" : ""}${growthValue}%`;
                  const growthClass =
                    growthValue == null
                      ? "text-slate-400"
                      : growthValue >= 0
                        ? "text-emerald-400"
                        : "text-rose-400";
                  return (
                    <span className={`text-xs font-bold ${growthClass}`}>
                      {growthLabel}
                    </span>
                  );
                })()}
              </div>
            ))}
            {!(growthData?.rows || []).length ? (
              <p className="text-sm text-slate-500">
                No growth data available yet.
              </p>
            ) : null}
          </div>
        </Card>

        <Card
          title="API Key Usage"
          subtitle="Most used keys in the last 30 days"
        >
          <div className="space-y-3">
            {(apiKeyUsageData?.rows || []).slice(0, 10).map((row) => (
              <div
                key={row.apiKeyId}
                className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {row.label || row.mask || row.apiKeyId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.mask || "Masked key"} · {row.environment} · last used{" "}
                      {row.lastUsedAt
                        ? new Date(row.lastUsedAt).toLocaleString()
                        : "never"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-white">
                      {row.total.toLocaleString()} calls
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.errors.toLocaleString()} errors
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!(apiKeyUsageData?.rows || []).length ? (
              <p className="text-sm text-slate-500">No API key usage yet.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card
        title="Chain Coverage"
        subtitle="Users and transactions across supported networks"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {chainCards.map((chain, i) => (
            <div
              key={chain.id}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-tighter">
                  {chain.name}
                </span>
                <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-slate-500 uppercase">
                    Transactions
                  </span>
                  <span className="text-sm font-mono text-cyan-400 font-bold">
                    {chain.transactions.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-slate-500 uppercase">
                    Linked Users
                  </span>
                  <span className="text-sm font-mono text-white">
                    {chain.users.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {!chainCards.length ? (
            <p className="text-sm text-slate-500">
              No chain stats available yet.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
