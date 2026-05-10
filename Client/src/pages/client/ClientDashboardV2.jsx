import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import CountUp from "react-countup";
import ChainSelector from "../../components/ChainSelector.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import {
  api,
  generateApiKey,
  rotateApiKey,
  revokeApiKey,
} from "../../lib/api.js";
import { CHAINS } from "../../constants/chains.js";
import ParticleNetwork from "../../components/ParticleNetwork.jsx";
import { maskAddress, maskEmail } from "../../lib/masking.js";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const SCOPES = ["read:balance", "read:history", "write:tx", "webhooks:manage"];

function useDashboardData(chain, address) {
  const stats = useQuery({
    queryKey: ["stats", chain],
    queryFn: () => api.get("/api/data/stats").then((r) => r.data),
  });
  const history = useQuery({
    queryKey: ["history", chain, address],
    enabled: Boolean(address),
    queryFn: () =>
      api
        .get(`/api/onchain/history/${address}`, {
          params: { chain, limit: 200, offset: 0 },
        })
        .then((r) => r.data?.data || r.data),
  });
  const balance = useQuery({
    queryKey: ["balance", chain, address],
    enabled: Boolean(address),
    queryFn: () =>
      api
        .get(`/api/onchain/balance/${address}`, { params: { chain } })
        .then((r) => r.data?.data || r.data),
  });
  const keys = useQuery({
    queryKey: ["keys"],
    queryFn: () => api.get("/api/keys").then((r) => r.data),
  });
  const webhooks = useQuery({
    queryKey: ["webhooks", chain],
    queryFn: () => api.get("/api/webhooks").then((r) => r.data?.data || r.data),
  });
  return { stats, history, balance, keys, webhooks };
}

function GlassCard({ children, className = "" }) {
  return (
    <motion.div
      variants={item}
      whileHover={{
        y: -4,
        boxShadow: "0 10px 30px -10px rgba(124, 58, 237, 0.2)",
      }}
      className={`rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-xl transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ——— One-Time Key Reveal Modal ——— */
function KeyRevealModal({ rawKey, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[#1a1f2e] border border-yellow-500/30 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-yellow-400 text-xl">⚠️</span>
          <h3 className="text-lg font-bold text-white">
            Save Your API Key Now
          </h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          This is the <strong className="text-yellow-400">only time</strong>{" "}
          your full key will be shown. Copy it and store it securely.
        </p>
        <div className="relative rounded-xl bg-black/50 border border-slate-700 p-4 font-mono text-sm text-emerald-400 break-all select-all">
          {rawKey}
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={copy}
            className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-bold text-white transition-colors"
          >
            {copied ? "✓ Copied!" : "📋 Copy Key"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-700 hover:bg-slate-600 py-2.5 text-sm font-medium text-white transition-colors"
          >
            I've Saved It
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ——— API Key Manager Section ——— */
function ApiKeySection({ keysQuery }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState(["read:balance"]);
  const [revealKey, setRevealKey] = useState(null);
  const [selectedWalletId, setSelectedWalletId] = useState(null);

  // Get wallets data
  const walletsQuery = useQuery({
    queryKey: ["wallets"],
    queryFn: () => api.get("/api/wallets").then((r) => r.data),
  });
  const wallets = useMemo(
    () => walletsQuery.data?.wallets || [],
    [walletsQuery.data],
  );

  const keys = useMemo(
    () => (Array.isArray(keysQuery.data) ? keysQuery.data : []),
    [keysQuery.data],
  );

  const handleCreate = useCallback(async () => {
    if (!label.trim()) return;
    setCreating(true);
    try {
      const data = await generateApiKey(label.trim(), scopes, selectedWalletId);
      setRevealKey(data.rawKey);
      setLabel("");
      setScopes(["read:balance"]);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["keys"] });
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to create key", "error");
    } finally {
      setCreating(false);
    }
  }, [label, scopes, selectedWalletId, qc, showToast]);

  const handleRotate = useCallback(
    async (id, mask) => {
      if (
        !window.confirm(
          `Rotate key ${mask}? The old key stops working immediately.`,
        )
      )
        return;
      try {
        const data = await rotateApiKey(id);
        setRevealKey(data.rawKey);
        qc.invalidateQueries({ queryKey: ["keys"] });
        showToast("Key rotated", "success");
      } catch (e) {
        showToast(e.response?.data?.error || "Rotate failed", "error");
      }
    },
    [qc, showToast],
  );

  const handleRevoke = useCallback(
    async (id) => {
      if (
        window.prompt("Type DELETE to permanently revoke this key") !== "DELETE"
      )
        return;
      try {
        await revokeApiKey(id);
        qc.invalidateQueries({ queryKey: ["keys"] });
        showToast("Key revoked permanently", "success");
      } catch (e) {
        showToast(e.response?.data?.error || "Revoke failed", "error");
      }
    },
    [qc, showToast],
  );

  return (
    <>
      {revealKey && (
        <KeyRevealModal rawKey={revealKey} onClose={() => setRevealKey(null)} />
      )}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-cf-muted">
            🔑 API Keys
          </p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
          >
            {showForm ? "Cancel" : "+ New Key"}
          </button>
        </div>
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Key label (e.g. Mobile App)"
                    className="col-span-2 w-full rounded-lg bg-black/30 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  {wallets.length > 1 && (
                    <select
                      value={selectedWalletId || ""}
                      onChange={(e) =>
                        setSelectedWalletId(e.target.value || null)
                      }
                      className="col-span-2 w-full rounded-lg bg-black/30 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                    >
                      <option value="">All Wallets</option>
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.label} ({wallet.address.slice(0, 6)}...
                          {wallet.address.slice(-4)})
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {SCOPES.map((s) => (
                      <label
                        key={s}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs cursor-pointer transition-colors ${scopes.includes(s) ? "bg-violet-600/30 text-violet-300 border border-violet-500/50" : "bg-white/5 text-slate-400 border border-white/10"}`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={scopes.includes(s)}
                          onChange={(e) =>
                            setScopes((p) =>
                              e.target.checked
                                ? [...p, s]
                                : p.filter((x) => x !== s),
                            )
                          }
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Select Wallet (Optional)
                  </label>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full rounded-lg bg-black/30 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">All Wallets</option>
                    {wallets.map((wallet) => (
                      <option key={wallet._id} value={wallet._id}>
                        {wallet.label ||
                          `${wallet.chain} - ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating || !label.trim()}
                  className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  {creating ? "Generating..." : "Generate Key"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {keys.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No API keys yet. API keys are optional for wallet users - you can
            still access your wallet data below.
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-auto custom-scrollbar">
            {keys.map((k) => (
              <motion.div
                key={k.id}
                whileHover={{ x: 2 }}
                className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-300 truncate">
                      {k.mask}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${k.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {k.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {k.label || "Untitled"} · {(k.scopes || []).join(", ")}
                  </p>
                </div>
                {k.status === "Active" && (
                  <div className="flex gap-1.5 ml-3">
                    <button
                      onClick={() => handleRotate(k.id, k.mask)}
                      className="rounded-lg bg-sky-600/20 hover:bg-sky-600/40 px-2.5 py-1 text-xs text-sky-400 font-medium transition-colors"
                    >
                      Rotate
                    </button>
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="rounded-lg bg-red-600/20 hover:bg-red-600/40 px-2.5 py-1 text-xs text-red-400 font-medium transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
    </>
  );
}

/* ——— Wallet Manager Section ——— */
function WalletSection() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [label, setLabel] = useState("");
  const [linking, setLinking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const walletsQuery = useQuery({
    queryKey: ["wallets"],
    queryFn: () => api.get("/api/wallets").then((r) => r.data),
  });
  const wallets = useMemo(
    () => walletsQuery.data?.wallets || [],
    [walletsQuery.data],
  );

  const handleLink = async () => {
    if (!address.startsWith("0x") && chain !== "solana") {
      showToast("Please enter a valid EVM address", "error");
      return;
    }
    setLinking(true);
    try {
      await api.post("/api/wallets/link", {
        address,
        chain,
        type: "injected",
        label,
      });
      setAddress("");
      setLabel("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      showToast("Wallet linked successfully", "success");
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to link wallet", "error");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (id) => {
    if (!window.confirm("Unlink this wallet?")) return;
    try {
      await api.delete(`/api/wallets/${id}`);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      showToast("Wallet unlinked", "success");
    } catch (e) {
      showToast("Failed to unlink", "error");
    }
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-cf-muted">
          💳 Linked Wallets
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
        >
          {showForm ? "Cancel" : "+ Link Wallet"}
        </button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x... address"
                  className="col-span-2 w-full rounded-lg bg-black/30 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Label (e.g. My Ledger)"
                  className="w-full rounded-lg bg-black/30 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className="w-full rounded-lg bg-black/30 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {CHAINS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleLink}
                disabled={linking || !address}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-blue-500 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {linking ? "Linking..." : "Confirm Link"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="space-y-2 max-h-[300px] overflow-auto custom-scrollbar">
        {wallets.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No wallets linked yet.
          </p>
        ) : (
          wallets.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-slate-300 truncate">
                  {maskAddress(w.shortAddress)}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tight">
                  {w.label || "Untitled"} · {w.chain}
                </p>
              </div>
              <button
                onClick={() => handleUnlink(w.id)}
                className="rounded-lg bg-red-600/10 hover:bg-red-600/20 px-2 py-1 text-[10px] text-red-400 font-bold border border-red-500/20 transition-colors"
              >
                Unlink
              </button>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}

export default function ClientDashboardV2() {
  const navigate = useNavigate();
  const { user, activeChain, setActiveChain } = useAuth();
  const chain = activeChain || "ethereum";
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const walletsQuery = useQuery({
    queryKey: ["wallets"],
    queryFn: () => api.get("/api/wallets").then((r) => r.data),
  });
  const wallets = useMemo(
    () => walletsQuery.data?.wallets || [],
    [walletsQuery.data],
  );
  const activeWallet = useMemo(() => {
    if (selectedWalletId) return wallets.find((w) => w.id === selectedWalletId);
    return wallets.find((w) => w.chain === chain) || wallets[0];
  }, [wallets, selectedWalletId, chain]);

  const address = activeWallet?.address || "";
  const { stats, history, balance, keys, webhooks } = useDashboardData(
    activeWallet?.chain || chain,
    address,
  );

  const [txSearch, setTxSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const txRows = useMemo(() => {
    if (!history.data) return [];
    let rows = Array.isArray(history.data)
      ? history.data
      : history.data.rows || [];

    // Address filter
    if (address) {
      rows = rows.filter(
        (r) =>
          r.from?.toLowerCase() === address.toLowerCase() ||
          r.to?.toLowerCase() === address.toLowerCase(),
      );
    }

    // Search filter
    if (txSearch) {
      const s = txSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.hash?.toLowerCase().includes(s) ||
          r.from?.toLowerCase().includes(s) ||
          r.to?.toLowerCase().includes(s),
      );
    }

    // Date filter
    if (fromDate || toDate) {
      rows = rows.filter((r) => {
        const ts = r.timestamp * 1000;
        if (fromDate && ts < new Date(fromDate).getTime()) return false;
        if (toDate && ts > new Date(toDate).setHours(23, 59, 59, 999))
          return false;
        return true;
      });
    }

    return rows;
  }, [history.data, address, txSearch, fromDate, toDate]);

  const chartRows = useMemo(
    () =>
      txRows
        .slice(0, 24)
        .map((r, i) => ({
          name: String(i + 1),
          value: Number(r?.amount || 0),
        })),
    [txRows],
  );
  const chainDist = useMemo(
    () =>
      CHAINS.map((c) => ({
        name: c.name,
        value: c.id === chain ? 70 : 10,
        fill: c.color,
      })),
    [chain],
  );
  const webhookRows = useMemo(
    () =>
      Array.isArray(webhooks.data)
        ? webhooks.data
        : webhooks.data?.rows || webhooks.data?.data || [],
    [webhooks.data],
  );

  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: txRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 8,
  });

  return (
    <main className="relative mx-auto max-w-[1500px] px-6 py-8">
      <ParticleNetwork />

      {wallets.length === 0 && !walletsQuery.isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl bg-gradient-to-r from-violet-600/20 to-cyan-500/20 border border-violet-500/30 p-8 backdrop-blur-xl text-center"
        >
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-violet-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-violet-400 text-3xl">
                account_balance_wallet
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Integrate Your First Wallet
            </h2>
            <p className="text-slate-400 mb-6">
              To start tracking transactions and using Chain Forge analytics,
              you must integrate at least one wallet and configure your
              preferred chains.
            </p>
            <button
              onClick={() => navigate("/wallets")}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
            >
              Go to Wallet Integration
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </button>
          </div>
        </motion.div>
      )}

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between relative z-50">
        <ChainSelector
          activeId={chain}
          onSelect={(id) => {
            setActiveChain(id);
            setSelectedWalletId(null);
          }}
        />
        <div className="flex flex-wrap items-center gap-3 relative z-50">
          {wallets.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 backdrop-blur-md relative z-50">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Active Wallet:
              </span>
              <select
                value={selectedWalletId || ""}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer relative z-50"
              >
                {!selectedWalletId && (
                  <option value="">Select a wallet...</option>
                )}
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-[#1a1f2e]">
                    {w.label || maskAddress(w.shortAddress)} ({w.chain})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-1.5 backdrop-blur-md">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-[10px] text-slate-300 font-bold focus:outline-none uppercase"
            />
            <span className="text-slate-600 text-xs">→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-[10px] text-slate-300 font-bold focus:outline-none uppercase"
            />
          </div>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {address && (
          <div className="rounded-xl bg-violet-600/10 border border-violet-500/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs text-slate-300 font-mono">
                Monitoring:{" "}
                <span className="text-violet-400 font-bold">
                  {maskAddress(address)}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <input
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search transactions..."
                className="bg-transparent border-b border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 px-1 py-0.5 min-w-[200px]"
              />
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                History is filtered to this wallet only
              </p>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <GlassCard>
            <p className="text-xs uppercase tracking-wider text-cf-muted">
              Wallet Balance
            </p>
            <h2 className="mt-2 text-3xl font-bold text-cf-text">
              <CountUp
                end={Number(balance.data?.balance || 0)}
                decimals={4}
                duration={0.8}
              />{" "}
              <span className="text-sm text-slate-500 font-normal">
                {activeWallet?.chain === "ethereum"
                  ? "ETH"
                  : activeWallet?.chain || ""}
              </span>
            </h2>
          </GlassCard>
          <GlassCard>
            <p className="text-xs uppercase tracking-wider text-cf-muted">
              Filtered Volume
            </p>
            <h2 className="mt-2 text-3xl font-bold text-cf-text">
              <CountUp
                end={txRows.reduce((a, b) => a + Number(b.amount || 0), 0)}
                decimals={4}
                duration={0.8}
              />
            </h2>
          </GlassCard>
          <GlassCard>
            <p className="text-xs uppercase tracking-wider text-cf-muted">
              Linked Assets
            </p>
            <h2 className="mt-2 text-3xl font-bold text-cf-text">
              <CountUp end={wallets.length} duration={0.8} />
            </h2>
          </GlassCard>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <GlassCard className="lg:col-span-8">
            <p className="mb-2 text-xs uppercase tracking-wider text-cf-muted">
              Transaction Timeline
            </p>
            <div className="h-64 min-h-[256px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartRows}>
                  <defs>
                    <linearGradient id="txFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="url(#txFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
          <GlassCard className="lg:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wider text-cf-muted">
                Chain Distribution
              </p>
              <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                Multi-Chain
              </span>
            </div>
            <div className="h-64 min-h-[256px] min-w-0 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                  <img
                    src={CHAINS.find((c) => c.id === chain)?.logoUrl}
                    className="w-6 h-6 rounded-full"
                    alt="Active"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                  {chain}
                </span>
              </div>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={chainDist}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chainDist.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md">
                            <p className="text-xs font-bold text-white mb-1">
                              {payload[0].name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Activity:{" "}
                              <span className="text-violet-400">
                                {payload[0].value}%
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <GlassCard className="lg:col-span-8">
            <p className="mb-2 text-xs uppercase tracking-wider text-cf-muted">
              Transaction Timeline
            </p>
            <div className="h-64 min-h-[256px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartRows}>
                  <defs>
                    <linearGradient id="txFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="url(#txFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
          <div className="lg:col-span-4 space-y-6">
            <WalletSection />
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-wider text-cf-muted">
                  Linked API Key
                </p>
                <button
                  onClick={() => navigate("/settings")}
                  className="text-[10px] font-bold text-cyan-400 hover:underline"
                >
                  Manage Keys →
                </button>
              </div>
              {keys.data?.[0] ? (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                  <div className="font-mono text-sm text-cyan-400">
                    {keys.data[0].mask}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {keys.data[0].label}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  No keys generated. (Optional for wallet users)
                </p>
              )}
            </GlassCard>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ApiKeySection keysQuery={keys} />
          <GlassCard>
            <p className="mb-2 text-xs uppercase tracking-wider text-cf-muted">
              Webhook events live feed
            </p>
            <AnimatePresence initial={false}>
              {webhookRows.slice(0, 5).map((w, i) => (
                <motion.div
                  key={w.id || i}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="mb-2 rounded-lg bg-cf-input border border-cf-border/50 px-3 py-2 text-xs text-cf-text shadow-sm"
                >
                  <span className="font-medium text-emerald-400 mr-2">●</span>
                  {w.label || w.url || "Webhook"} · active
                </motion.div>
              ))}
            </AnimatePresence>
          </GlassCard>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-cf-muted">
                Wallet Transactions
              </p>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                {txRows.length} Matches
              </span>
            </div>
            <div
              ref={parentRef}
              className="max-h-[360px] overflow-auto custom-scrollbar"
            >
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((vRow) => {
                  const tx = txRows[vRow.index];
                  return (
                    <motion.div
                      key={tx?.hash || vRow.key}
                      className="absolute left-0 top-0 w-full px-1"
                      style={{ transform: `translateY(${vRow.start}px)` }}
                      whileHover={{ x: 4, scale: 1.01 }}
                    >
                      <div className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                        <div className="flex flex-col">
                          <span className="text-xs text-cf-text font-mono">
                            {tx?.hash?.slice(0, 16) || "tx"}...
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(tx.timestamp * 1000).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-semibold ${tx.from?.toLowerCase() === address.toLowerCase() ? "text-red-400" : "text-emerald-400"}`}
                        >
                          {tx.from?.toLowerCase() === address.toLowerCase()
                            ? "-"
                            : "+"}
                          {tx?.amount || tx?.valueFormatted || "0"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                {txRows.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-10">
                    No transactions found matching your filters.
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <p className="mb-2 text-xs uppercase tracking-wider text-cf-muted">
              API usage + quota
            </p>
            <div className="space-y-3">
              <div className="h-2 rounded bg-cf-input overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (stats.data?.totalTransactions || 0) % 100)}%`,
                  }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
                />
              </div>
              <p className="text-sm text-cf-muted">
                {keys.data?.length || 0} active API keys
              </p>
              <p className="text-sm text-cf-muted">
                {stats.data?.activeSessions || 0} sessions
              </p>
            </div>
          </GlassCard>
        </section>
      </motion.div>
    </main>
  );
}
