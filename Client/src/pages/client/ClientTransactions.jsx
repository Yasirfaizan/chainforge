import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../lib/api.js";
import { CHAINS } from "../../constants/chains.js";
import { maskAddress } from "../../lib/masking.js";
import ChainSelector from "../../components/ChainSelector.jsx";
import ParticleNetwork from "../../components/ParticleNetwork.jsx";

const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

export default function ClientTransactions() {
  const { activeChain, setActiveChain } = useAuth();
  const chain = activeChain || "ethereum";
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [txSearch, setTxSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: () => api.get("/api/wallets").then((r) => r.data) });
  const wallets = useMemo(() => walletsQuery.data?.wallets || [], [walletsQuery.data]);
  
  const activeWallet = useMemo(() => {
    if (selectedWalletId) return wallets.find(w => w.id === selectedWalletId);
    const chainMatch = wallets.find(w => w.chain === chain);
    return chainMatch || wallets[0];
  }, [wallets, selectedWalletId, chain]);

  const address = activeWallet?.address || "";
  
  const historyQuery = useQuery({ 
    queryKey: ["history", activeWallet?.chain || chain, address], 
    enabled: Boolean(address), 
    queryFn: () => api.get(`/api/onchain/history/${address}`, { params: { chain: activeWallet?.chain || chain, limit: 500 } }).then((r) => r.data?.data || r.data) 
  });

  const txRows = useMemo(() => {
    if (!historyQuery.data) return [];
    let rows = Array.isArray(historyQuery.data) ? historyQuery.data : historyQuery.data.rows || [];
    
    if (address) {
      rows = rows.filter(r => r.from?.toLowerCase() === address.toLowerCase() || r.to?.toLowerCase() === address.toLowerCase());
    }
    if (txSearch) {
      const s = txSearch.toLowerCase();
      rows = rows.filter(r => r.hash?.toLowerCase().includes(s) || r.from?.toLowerCase().includes(s) || r.to?.toLowerCase().includes(s));
    }
    if (fromDate || toDate) {
      rows = rows.filter(r => {
        const ts = r.timestamp * 1000;
        if (fromDate && ts < new Date(fromDate).getTime()) return false;
        if (toDate && ts > new Date(toDate).setHours(23, 59, 59, 999)) return false;
        return true;
      });
    }
    return rows;
  }, [historyQuery.data, address, txSearch, fromDate, toDate]);

  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({ count: txRows.length, getScrollElement: () => parentRef.current, estimateSize: () => 50, overscan: 10 });

  return (
    <main className="relative mx-auto max-w-[1500px] px-6 py-8 min-h-screen">
      <ParticleNetwork />
      
      <div className="mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-50">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Transaction Explorer</h1>
          <p className="text-slate-400 text-sm mt-1">Detailed history and marketing analysis for your linked wallets</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-50">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-1.5 backdrop-blur-md relative z-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 ml-2">Range:</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-[11px] text-slate-300 font-bold focus:outline-none uppercase" />
            <span className="text-slate-600 text-xs">→</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-[11px] text-slate-300 font-bold focus:outline-none uppercase mr-2" />
          </div>
          <button onClick={() => {setFromDate(""); setToDate(""); setTxSearch(""); setSelectedWalletId(null);}} className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 transition-colors">Reset</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-6">
          <motion.div variants={item} initial="hidden" animate="show" className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl relative z-30">
            <h3 className="text-xs uppercase font-bold text-slate-500 mb-4 tracking-widest">Network & Wallet</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-600 block mb-2">Select Chain</label>
                <ChainSelector activeId={chain} onSelect={(id) => { setActiveChain(id); setSelectedWalletId(null); }} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-600 block mb-2">Active Wallet</label>
                <select 
                  value={selectedWalletId || ""} 
                  onChange={(e) => setSelectedWalletId(e.target.value)} 
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {!selectedWalletId && <option value="">Auto-select...</option>}
                  {wallets.map(w => <option key={w.id} value={w.id} className="bg-[#1a1f2e]">{w.label || w.shortAddress} ({w.chain})</option>)}
                </select>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} initial="hidden" animate="show" className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl relative z-20">
            <h3 className="text-xs uppercase font-bold text-slate-500 mb-4 tracking-widest">Live Search</h3>
            <input 
              value={txSearch} 
              onChange={(e) => setTxSearch(e.target.value)} 
              placeholder="Search hash or address..." 
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
            />
          </motion.div>

          <motion.div variants={item} initial="hidden" animate="show" className="rounded-2xl bg-violet-600/10 border border-violet-500/20 p-5">
            <p className="text-[10px] uppercase font-bold text-violet-400 mb-1">Marketing Insight</p>
            <p className="text-xs text-slate-400 leading-relaxed">Filtering by wallet allows you to track specific marketing campaigns or business branches independently.</p>
          </motion.div>
        </aside>

        {/* Main List */}
        <section className="lg:col-span-9">
          <motion.div variants={item} initial="hidden" animate="show" className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">History</span>
                <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-400">{txRows.length} Results</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Live from RPC</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 text-[11px] uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Transaction Details</th>
                    <th className="px-6 py-4 font-bold">Type</th>
                    <th className="px-6 py-4 font-bold">Value</th>
                    <th className="px-6 py-4 font-bold">Date & Time</th>
                  </tr>
                </thead>
              </table>
              <div ref={parentRef} className="max-h-[600px] overflow-auto custom-scrollbar">
                <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((vRow) => {
                    const tx = txRows[vRow.index];
                    const isOut = tx.from?.toLowerCase() === address.toLowerCase();
                    return (
                      <div 
                        key={tx.hash || vRow.key} 
                        className="absolute left-0 top-0 w-full border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                        style={{ height: 50, transform: `translateY(${vRow.start}px)` }}
                      >
                        <div className="flex items-center h-full px-6">
                          <div className="w-1/4 min-w-[200px]">
                            <div className="font-mono text-xs text-violet-400 truncate">{maskAddress(tx.hash)}</div>
                            <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                              {isOut ? `To: ${maskAddress(tx.to)}` : `From: ${maskAddress(tx.from)}`}
                            </div>
                          </div>
                          <div className="w-1/4">
                            <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${isOut ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {isOut ? 'Sent' : 'Received'}
                            </span>
                          </div>
                          <div className={`w-1/4 font-bold ${isOut ? 'text-slate-300' : 'text-white'}`}>
                            {isOut ? '-' : '+'}{tx.amount || tx.valueFormatted || '0'} <span className="text-[10px] text-slate-500 uppercase">{activeWallet?.chain === 'ethereum' ? 'ETH' : activeWallet?.chain || ''}</span>
                          </div>
                          <div className="w-1/4 text-xs text-slate-500">
                            {new Date(tx.timestamp * 1000).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {txRows.length === 0 && !historyQuery.isLoading && (
                    <div className="py-20 text-center">
                      <p className="text-slate-500 text-sm italic">No transactions found matching your criteria.</p>
                      <p className="text-[10px] text-slate-600 mt-1 uppercase">Try adjusting your filters or selecting a different wallet.</p>
                    </div>
                  )}
                  {historyQuery.isLoading && (
                    <div className="py-20 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-2" />
                      <p className="text-slate-500 text-sm">Fetching on-chain data...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
