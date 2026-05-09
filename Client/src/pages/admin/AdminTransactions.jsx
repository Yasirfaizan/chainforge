import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ArrowLeft, ArrowRight, Download, Eye, ExternalLink, User as UserIcon } from "lucide-react";
import { fetchAdminTransactions } from "../../lib/api.js";
import { CHAINS } from "../../constants/chains.js";
import { format } from "date-fns";
import { downloadCsv } from "../../utils/downloadCsv.js";

function TransactionDetailModal({ tx, onClose }) {
  if (!tx) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0f131b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Transaction Details</h2>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              tx.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {tx.status}
            </span>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Chain</p>
                <p className="text-sm font-medium text-white capitalize">{tx.chain}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Date & Time</p>
                <p className="text-sm font-medium text-white">{format(new Date(tx.createdAt), "PPP p")}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Transaction Hash</p>
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigator.clipboard.writeText(tx.hash)}>
                <code className="text-xs font-mono text-cyan-400 break-all bg-cyan-500/5 px-2 py-1 rounded border border-cyan-500/10">{tx.hash}</code>
                <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">From</p>
                <code className="text-[10px] font-mono text-slate-300 break-all">{tx.from}</code>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">To</p>
                <code className="text-[10px] font-mono text-slate-300 break-all">{tx.to}</code>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Associated User</p>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-white/5">
                  <UserIcon className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{tx.userId?.name || "Anonymous"}</p>
                  <p className="text-xs text-slate-500">{tx.userId?.email || "No email"}</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="mt-8 w-full rounded-xl bg-white/5 border border-white/10 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminTransactions() {
  const [q, setQ] = useState("");
  const [chain, setChain] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedTx, setSelectedTx] = useState(null);
  const limit = 25;

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["admin-transactions", q, chain, status, page],
    queryFn: () => fetchAdminTransactions({ q, chain, status, limit, offset: page * limit }),
    keepPreviousData: true,
  });

  const transactions = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleExport = () => {
    const csvData = transactions.map(t => ({
      Date: format(new Date(t.createdAt), "yyyy-MM-dd HH:mm"),
      Hash: t.hash,
      Chain: t.chain,
      From: t.from,
      To: t.to,
      Value: t.value || "0",
      Status: t.status,
      UserEmail: t.userId?.email || "N/A"
    }));
    downloadCsv(csvData, `transactions-${format(new Date(), "yyyyMMdd")}.csv`);
  };

  return (
    <main className="p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Global Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor all blockchain activity across the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-500 transition-colors" />
          <input 
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search hash or address..."
            className="w-full rounded-xl bg-[#0f131b] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>

        <div className="relative group">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <select 
            value={chain}
            onChange={(e) => { setChain(e.target.value); setPage(0); }}
            className="w-full rounded-xl bg-[#0f131b] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 appearance-none transition-all"
          >
            <option value="all">All Chains</option>
            {CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="relative group">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <select 
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="w-full rounded-xl bg-[#0f131b] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 appearance-none transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button 
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono text-slate-500 px-2">
            Page {page + 1} of {totalPages || 1}
          </span>
          <button 
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-all"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0f131b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Hash</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Chain</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-full" /></td>
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic text-sm">No transactions found matching your filters.</td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <motion.tr 
                      key={tx._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-cyan-400 truncate max-w-[120px]">{tx.hash}</span>
                          <span className="text-[10px] text-slate-500">{tx.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-white capitalize">{tx.chain}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                            {tx.userId?.name?.[0] || "?"}
                          </div>
                          <span className="text-xs text-slate-300 truncate max-w-[150px]">{tx.userId?.email || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedTx(tx)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </main>
  );
}
