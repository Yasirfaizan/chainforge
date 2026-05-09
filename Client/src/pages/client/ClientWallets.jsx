import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api.js";
import { CHAINS } from "../../constants/chains.js";
import { useToast } from "../../context/ToastContext.jsx";
import ParticleNetwork from "../../components/ParticleNetwork.jsx";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

export default function ClientWallets() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [label, setLabel] = useState("");
  const [linking, setLinking] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: () => api.get("/api/wallets").then((r) => r.data) });
  const wallets = useMemo(() => walletsQuery.data?.wallets || [], [walletsQuery.data]);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!address) { showToast("Please enter a wallet address", "error"); return; }
    if (!address.startsWith("0x") && chain !== "solana") { showToast("Invalid EVM address", "error"); return; }
    
    setLinking(true);
    try {
      await api.post("/api/wallets/link", { 
        address, 
        chain, 
        type: chain === "solana" ? "solana" : "evm", 
        label: label || "Primary Wallet"
      });
      setAddress(""); setLabel(""); setShowAddForm(false);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      showToast("Wallet linked and configured successfully", "success");
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to link wallet", "error");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (id) => {
    if (!window.confirm("Are you sure you want to unlink this wallet? Chain Forge will stop tracking its history.")) return;
    try {
      await api.delete(`/api/wallets/${id}`);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      showToast("Wallet unlinked", "success");
    } catch (e) {
      showToast("Failed to unlink wallet", "error");
    }
  };

  return (
    <main className="relative mx-auto max-w-[1200px] px-6 py-10 min-h-screen">
      <ParticleNetwork />
      
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight">Wallet Integration</h1>
        <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
          Link and configure your blockchain wallets here. Once integrated, Chain Forge will automatically track transactions and trigger webhooks for these addresses across multiple chains.
        </p>
      </header>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Management Controls */}
        <div className="lg:col-span-1 space-y-6">
          <motion.button 
            variants={item}
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 p-[1px] font-bold text-white shadow-lg hover:shadow-violet-500/20 transition-all active:scale-[0.98]"
          >
            <div className="bg-[#0f131b] rounded-[15px] py-4 px-6 flex items-center justify-between">
              <span>{showAddForm ? "Cancel Integration" : "+ Add New Wallet"}</span>
              <span className="material-symbols-outlined">{showAddForm ? "close" : "account_balance_wallet"}</span>
            </div>
          </motion.button>

          <AnimatePresence>
            {showAddForm && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="overflow-hidden"
              >
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white mb-4">Integrate Wallet</h3>
                  <form onSubmit={handleLink} className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Network Chain</label>
                      <select 
                        value={chain} 
                        onChange={(e) => setChain(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                      >
                        {CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Wallet Address</label>
                      <input 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        placeholder="0x... or Solana address" 
                        className="w-full rounded-xl bg-black/40 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Wallet Label (Optional)</label>
                      <input 
                        value={label} 
                        onChange={(e) => setLabel(e.target.value)} 
                        placeholder="e.g. Marketing Ledger" 
                        className="w-full rounded-xl bg-black/40 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={linking}
                      className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50"
                    >
                      {linking ? "Integrating..." : "Confirm Integration"}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={item} className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl">
            <h3 className="text-xs uppercase font-bold text-slate-500 mb-4 tracking-widest">Setup Guide</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold">1</span>
                <p className="text-xs text-slate-400 leading-tight">Link your primary business wallet to start tracking incoming payments.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold">2</span>
                <p className="text-xs text-slate-400 leading-tight">Each wallet can be configured for a specific chain (Ethereum, Polygon, etc.).</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Integrated Wallets List */}
        <div className="lg:col-span-2">
          <motion.div variants={item} className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden min-h-[400px]">
            <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Integrated Wallets</h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{wallets.length} Connected</span>
            </div>
            
            <div className="divide-y divide-white/5">
              {wallets.length === 0 ? (
                <div className="py-20 text-center">
                  <span className="material-symbols-outlined text-slate-700 text-5xl mb-4">account_balance_wallet</span>
                  <p className="text-slate-500 text-sm">No wallets integrated yet.</p>
                  <button onClick={() => setShowAddForm(true)} className="mt-4 text-violet-400 text-xs font-bold hover:underline uppercase">Integrate your first wallet now</button>
                </div>
              ) : wallets.map((w) => (
                <motion.div 
                  key={w.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex items-center justify-between px-6 py-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <span className="text-xl">
                        {w.chain === 'ethereum' ? 'Ξ' : w.chain === 'solana' ? '◎' : '⛓️'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{w.label || "Unnamed Wallet"}</h4>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{w.chain}</span>
                      </div>
                      <p className="text-xs font-mono text-slate-500 mt-1">{w.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4 hidden sm:block">
                      <p className="text-[10px] uppercase font-bold text-slate-600 mb-0.5">Integration Status</p>
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 justify-end">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </div>
                    <button 
                      onClick={() => handleUnlink(w.id)}
                      className="rounded-lg bg-red-600/10 hover:bg-red-600/20 px-3 py-1.5 text-xs font-bold text-red-400 transition-colors"
                    >
                      Unlink
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
