import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Trash2, RefreshCw, Key, User, Shield, Info, Copy, CheckCircle } from "lucide-react";
import { fetchAdminApiKeys, adminRotateApiKey, adminRevokeApiKey } from "../../lib/api.js";
import { format } from "date-fns";
import { useToast } from "../../context/ToastContext.jsx";

function KeyRevealModal({ rawKey, mask, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0f131b] border border-yellow-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500/50" />
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
            <Key className="h-5 w-5 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold text-white">New Key Generated</h2>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          The old key has been invalidated. This is the **only time** you will see this raw key. Please store it securely.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Mask (Public ID)</p>
            <code className="text-xs font-mono text-slate-300 block bg-white/5 p-3 rounded-xl border border-white/10">{mask}</code>
          </div>
          
          <div className="relative group">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Raw Secret Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-emerald-400 block bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 break-all select-all">
                {rawKey}
              </code>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3.5 text-sm font-bold text-white transition-all shadow-lg shadow-emerald-600/20"
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Secret Key"}
          </button>
          <button 
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/5 border border-white/10 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-all"
          >
            I've Saved It
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminAPIKeys() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [revealKey, setRevealKey] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-apikeys", q],
    queryFn: () => fetchAdminApiKeys({ q: q || undefined, limit: 100 }),
  });

  const rotateMutation = useMutation({
    mutationFn: (id) => adminRotateApiKey(id),
    onSuccess: (data) => {
      qc.invalidateQueries(["admin-apikeys"]);
      setRevealKey(data);
      showToast("API key rotated successfully", "success");
    },
    onError: () => showToast("Failed to rotate key", "error"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => adminRevokeApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries(["admin-apikeys"]);
      showToast("API key revoked permanently", "success");
    },
    onError: () => showToast("Failed to revoke key", "error"),
  });

  const handleRotate = (id, mask) => {
    if (window.confirm(`Are you sure you want to rotate key ${mask}? All applications using the old key will break immediately.`)) {
      rotateMutation.mutate(id);
    }
  };

  const handleRevoke = (id, mask) => {
    if (window.confirm(`PERMANENTLY REVOKE key ${mask}? This action is irreversible and will immediately stop all access associated with this key.`)) {
      revokeMutation.mutate(id);
    }
  };

  const keys = data?.rows || [];

  return (
    <main className="p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">API Key Management</h1>
          <p className="text-slate-500 text-sm mt-1">Audit and control all developer access keys on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-500 transition-colors" />
            <input 
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by owner email or mask..."
              className="w-full md:w-80 rounded-xl bg-[#0f131b] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0f131b] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">API Key (Mask)</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Owner</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Created</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-white/5 rounded-xl w-full" /></td>
                    </tr>
                  ))
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic text-sm">No API keys found.</td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <motion.tr 
                      key={k.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-cyan-400">{k.mask}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5">{k.label || "Untitled Key"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-slate-400 border border-white/5">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-white">{k.owner?.name || "Anonymous"}</span>
                            <span className="text-[10px] text-slate-500">{k.owner?.email || "No email"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          k.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {k.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {format(new Date(k.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleRotate(k.id, k.mask)}
                            title="Rotate Key"
                            className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleRevoke(k.id, k.mask)}
                            title="Revoke Permanently"
                            className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {revealKey && (
          <KeyRevealModal 
            rawKey={revealKey.rawKey} 
            mask={revealKey.mask} 
            onClose={() => setRevealKey(null)} 
          />
        )}
      </AnimatePresence>
    </main>
  );
}
