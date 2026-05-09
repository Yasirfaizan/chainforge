import { useEffect, useMemo, useRef, useState } from "react";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { downloadCsv } from "../../utils/downloadCsv.js";
import { fetchAdminUsers, updateUserStatus, fetchAdminApiKeys, adminRotateApiKey as rotateApiKey, adminRevokeApiKey as revokeApiKey } from "../../lib/api.js";
import { CHAINS } from "../../constants/chains.js";
import { useToast } from "../../context/ToastContext.jsx";
import { motion, AnimatePresence } from "framer-motion";

function KeyRevealModal({ rawKey, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[#1a1f2e] border border-yellow-500/30 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-yellow-400 text-xl">⚠️</span>
          <h3 className="text-lg font-bold text-white">New API Key Generated</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          The old key is now invalid. Copy this new key immediately.
          <br />
          <strong className="text-yellow-400">It will never be shown again.</strong>
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
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminUsers() {
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [chain, setChain] = useState("all");
  const [status, setStatus] = useState("all");
  const [authMethod, setAuthMethod] = useState("all");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState({});
  const [activeUser, setActiveUser] = useState(null);
  const [userKeys, setUserKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [revealKey, setRevealKey] = useState(null);
  const parentRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAdminUsers({
        q: q || undefined,
        chain: chain !== "all" ? chain : undefined,
        status: status !== "all" ? status : undefined,
        authMethod: authMethod !== "all" ? authMethod : undefined,
        limit: 200,
      }).then((d) => setRows(d.rows || [])).catch(() => setRows([]));
    }, 280);
    return () => clearTimeout(t);
  }, [q, chain, status, authMethod]);

  useEffect(() => {
    if (activeUser) {
      setLoadingKeys(true);
      fetchAdminApiKeys({ userId: activeUser._id })
        .then((d) => setUserKeys(d.rows || []))
        .catch(() => setUserKeys([]))
        .finally(() => setLoadingKeys(false));
    } else {
      setUserKeys([]);
    }
  }, [activeUser]);

  const handleRotate = async (id, mask) => {
    if (!window.confirm(`Rotate key ${mask}? The old key will stop working immediately.`)) return;
    try {
      const data = await rotateApiKey(id);
      setRevealKey(data.rawKey);
      showToast("Key rotated successfully", "success");
      fetchAdminApiKeys({ userId: activeUser._id }).then((d) => setUserKeys(d.rows || []));
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to rotate key", "error");
    }
  };

  const handleRevoke = async (id, mask) => {
    const ok = window.prompt(`Type REVOKE to confirm revoking key ${mask}`) === "REVOKE";
    if (!ok) return;
    try {
      await revokeApiKey(id);
      showToast("Key revoked", "success");
      fetchAdminApiKeys({ userId: activeUser._id }).then((d) => setUserKeys(d.rows || []));
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to revoke key", "error");
    }
  };

  const columns = useMemo(() => [
    { id: "select", header: "", cell: ({ row }) => <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} /> },
    { accessorKey: "name", header: "Name", cell: (info) => <button onClick={() => setActiveUser(info.row.original)} className="text-left hover:underline font-medium text-white">{info.getValue() || "-"}</button> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "authMethod", header: "Auth" },
    { accessorKey: "wallets", header: "Wallets", cell: (i) => i.row.original.wallets?.length || 0 },
    { 
      accessorKey: "status", 
      header: "Status",
      cell: (info) => {
        const val = info.getValue();
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
            val === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}>
            {val}
          </span>
        );
      }
    },
    { accessorKey: "createdAt", header: "Created", cell: (i) => i.getValue() ? new Date(i.getValue()).toLocaleDateString() : "-" },
    { 
      id: "actions", 
      header: "Actions", 
      cell: ({ row }) => {
        const u = row.original;
        const isActive = u.status === "Active";
        return (
          <button 
            onClick={() => toggle(u)} 
            className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded transition-colors ${
              isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {isActive ? "Suspend" : "Activate"}
          </button>
        );
      }
    },
  ], []);

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), state: { rowSelection: selected }, onRowSelectionChange: setSelected });
  const v = useVirtualizer({ count: table.getRowModel().rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 42, overscan: 10 });

  const toggle = async (u) => {
    const next = u.status === "Active" ? "Suspended" : "Active";
    try {
      await updateUserStatus(u._id, next);
      setRows((prev) => prev.map((x) => x._id === u._id ? { ...x, status: next } : x));
      showToast(`User ${next.toLowerCase()}`, "success");
    } catch {
      showToast("Update failed", "error");
    }
  };

  const bulkSuspend = () => {
    const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
    selectedRows.forEach((u) => toggle(u));
  };

  return (
    <section>
      {revealKey && <KeyRevealModal rawKey={revealKey} onClose={() => setRevealKey(null)} />}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="flex gap-2">
          <button className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={bulkSuspend}>Bulk suspend</button>
          <button className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={() => downloadCsv(rows, "users.csv")}>Export CSV</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users..." className="rounded border border-slate-700 bg-[#121722] px-2 py-1.5 text-sm" />
        <select value={chain} onChange={(e) => setChain(e.target.value)} className="rounded border border-slate-700 bg-[#121722] px-2 py-1.5 text-sm"><option value="all">All chains</option>{CHAINS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-700 bg-[#121722] px-2 py-1.5 text-sm"><option value="all">All status</option><option value="Active">Active</option><option value="Suspended">Suspended</option></select>
        <select value={authMethod} onChange={(e) => setAuthMethod(e.target.value)} className="rounded border border-slate-700 bg-[#121722] px-2 py-1.5 text-sm"><option value="all">All auth</option><option value="email">email</option><option value="google">google</option><option value="github">github</option><option value="wallet">wallet</option></select>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#111827]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>{hg.headers.map((h) => <th key={h.id} className="px-3 py-2 text-slate-400">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>
            ))}
          </thead>
        </table>
        <div ref={parentRef} className="max-h-[520px] overflow-auto">
          <div style={{ height: v.getTotalSize(), position: "relative" }}>
            {v.getVirtualItems().map((vi) => {
              const row = table.getRowModel().rows[vi.index];
              return (
                <div key={row.id} className="absolute left-0 top-0 w-full border-t border-slate-800 odd:bg-slate-900/30" style={{ transform: `translateY(${vi.start}px)` }}>
                  <table className="w-full text-sm"><tbody><tr>{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-3 py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr></tbody></table>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeUser && (
          <aside className="fixed right-0 top-0 z-30 h-full w-[420px] overflow-auto border-l border-slate-700 bg-[#0f131b] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{activeUser.name}</h2>
              <button onClick={() => setActiveUser(null)} className="text-slate-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">User Details</h3>
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Email:</span> {activeUser.email}</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Auth:</span> {activeUser.authMethod}</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Status:</span> 
                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      activeUser.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {activeUser.status}
                    </span>
                  </p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Created:</span> {new Date(activeUser.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">API Keys</h3>
                {loadingKeys ? (
                  <p className="text-sm text-slate-500 italic">Loading keys...</p>
                ) : userKeys.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No API keys found for this user.</p>
                ) : (
                  <div className="space-y-3">
                    {userKeys.map((k) => (
                      <div key={k.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm text-blue-400">{k.mask}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            k.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          }`}>
                            {k.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{k.label || "Untitled Key"}</p>
                        {k.status === "Active" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleRotate(k.id, k.mask)} className="text-[10px] font-bold text-sky-400 hover:underline uppercase tracking-tighter">Roll</button>
                            <button onClick={() => handleRevoke(k.id, k.mask)} className="text-[10px] font-bold text-red-400 hover:underline uppercase tracking-tighter">Revoke</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Raw Metadata</h3>
                <pre className="overflow-auto rounded-xl bg-black/50 p-4 text-[10px] text-slate-400 max-h-[300px] custom-scrollbar">
                  {JSON.stringify(activeUser, null, 2)}
                </pre>
              </div>
            </div>
          </aside>
        )}
      </AnimatePresence>
    </section>
  );
}
