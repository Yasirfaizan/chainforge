import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Routes, Route } from "react-router-dom";
import { Command } from "cmdk";
import { Bell, Search, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import { adminConsolePath } from "../../lib/adminPaths.js";
import AdminManagement from "./AdminManagement.jsx";
import AdminOverview from "./AdminOverview.jsx";
import AdminUsers from "./AdminUsers.jsx";
import AdminTransactions from "./AdminTransactions.jsx";
import AdminAPIKeys from "./AdminAPIKeys.jsx";
import AdminChainStats from "./AdminChainStats.jsx";
import AdminSettings from "./AdminSettings.jsx";
import AdminAuditLog from "./AdminAuditLog.jsx";
import AdminBilling from "./AdminBilling.jsx";

const NAV = [
  { to: "overview", label: "Overview" },
  { to: "users", label: "Users" },
  { to: "transactions", label: "Transactions" },
  { to: "apikeys", label: "API Keys" },
  { to: "webhooks", label: "Webhooks" },
  { to: "chainstats", label: "Chains" },
  { to: "rate-limits", label: "Rate Limits" },
  { to: "admin-management", label: "Admin Management" },
  { to: "audit-log", label: "Audit Log" },
  { to: "billing", label: "Billing" },
  { to: "settings", label: "Settings" },
];

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [live, setLive] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [env, setEnv] = useState("prod");

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let source;
    try {
      source = new EventSource(`${import.meta.env.VITE_API_URL || "http://localhost:5001"}/health`);
      source.onopen = () => setLive(true);
      source.onerror = () => setLive(false);
    } catch {
      setLive(false);
    }
    return () => source?.close();
  }, []);

  useEffect(() => {
    let timer;
    let logoutTimer;
    const reset = () => {
      setIdleWarning(false);
      clearTimeout(timer);
      clearTimeout(logoutTimer);
      timer = setTimeout(() => {
        setIdleWarning(true);
        logoutTimer = setTimeout(() => {
          logout();
          navigate(adminConsolePath("/login"));
        }, 30_000);
      }, 15 * 60 * 1000);
    };
    ["mousemove", "keydown", "click", "scroll"].forEach((ev) => window.addEventListener(ev, reset));
    reset();
    return () => {
      ["mousemove", "keydown", "click", "scroll"].forEach((ev) => window.removeEventListener(ev, reset));
      clearTimeout(timer);
      clearTimeout(logoutTimer);
    };
  }, [logout, navigate]);

  const commandRoutes = useMemo(() => NAV.filter((n) => n.to !== "webhooks" && n.to !== "rate-limits"), []);

  return (
    <div className="flex h-screen bg-[#0f1115] text-slate-100">
      <aside className="w-64 border-r border-slate-800 bg-[#0b0d11] p-3">
        <p className="px-2 pb-3 font-mono text-xs uppercase tracking-[0.16em] text-slate-500">ChainForge Console</p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className="relative block rounded-lg px-3 py-2 text-sm text-slate-300">
              {location.pathname.endsWith(`/${item.to}`) && (
                <motion.span layoutId="admin-pill" className="absolute inset-0 rounded-lg bg-slate-700/70" />
              )}
              <span className="relative">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-slate-800 px-4">
          <button onClick={() => setCmdOpen(true)} className="flex w-[320px] items-center gap-2 rounded-md border border-slate-700 bg-[#151922] px-3 py-1.5 text-sm text-slate-400">
            <Search className="h-4 w-4" /> Search… <span className="ml-auto text-xs">⌘K</span>
          </button>
          <select value={env} onChange={(e) => setEnv(e.target.value)} className="rounded-md border border-slate-700 bg-[#151922] px-2 py-1 text-xs">
            <option value="prod">prod</option><option value="staging">staging</option><option value="dev">dev</option>
          </select>
          <button className="rounded-md border border-slate-700 px-2 py-1 text-xs">Impersonate user</button>
          <button className="ml-auto rounded-md border border-slate-700 p-1.5"><Bell className="h-4 w-4" /></button>
          <div className="rounded-md border border-slate-700 px-2 py-1 text-xs">{user?.name || "Admin"}</div>
          <button onClick={() => { logout(); navigate(adminConsolePath("/login")); }} className="rounded-md bg-red-600 px-2 py-1 text-xs">Logout</button>
        </header>
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-1 text-xs">
          <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
          <span>{live ? "Live" : "Connecting"}</span>
        </div>
        <main className="flex-1 overflow-auto p-4">
          <Routes>
            <Route path="overview" element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="apikeys" element={<AdminAPIKeys />} />
            <Route path="webhooks" element={<AdminSettings />} />
            <Route path="chainstats" element={<AdminChainStats />} />
            <Route path="rate-limits" element={<AdminSettings />} />
            <Route path="admin-management" element={<AdminManagement />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route index element={<AdminOverview />} />
          </Routes>
        </main>
      </div>

      <Command.Dialog open={cmdOpen} onOpenChange={setCmdOpen} label="Command Menu" className="fixed left-1/2 top-20 z-50 w-[560px] -translate-x-1/2 overflow-hidden rounded-xl border border-slate-700 bg-[#0f131b] shadow-2xl">
        <Command.Input className="w-full border-b border-slate-800 bg-transparent px-3 py-2 text-sm outline-none" placeholder="Jump to..." />
        <Command.List className="max-h-80 overflow-auto p-1">
          {commandRoutes.map((item) => (
            <Command.Item
              key={item.to}
              className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-slate-700/60"
              onSelect={() => {
                navigate(item.to);
                setCmdOpen(false);
              }}
            >
              {item.label}
            </Command.Item>
          ))}
        </Command.List>
      </Command.Dialog>

      {idleWarning && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-[#121722] p-4">
            <p className="text-sm">You have been idle for 15 minutes. Session will expire in 30 seconds.</p>
            <button onClick={() => setIdleWarning(false)} className="mt-3 rounded bg-blue-600 px-3 py-1 text-sm">Stay signed in</button>
          </div>
        </div>
      )}
    </div>
  );
}
