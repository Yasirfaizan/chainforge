import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  LayoutDashboard,
  Settings,
  Users,
  KeyRound,
  List,
  BarChart2,
} from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/docs", label: "Docs", icon: Activity },
  { to: "/admin/dashboard/users", label: "Users", icon: Users },
  { to: "/admin/dashboard/transactions", label: "Transactions", icon: List },
  { to: "/admin/dashboard/apikeys", label: "API Keys", icon: KeyRound },
  { to: "/admin/dashboard/chainstats", label: "Chain Stats", icon: BarChart2 },
  { to: "/admin/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.aside
      layout
      className="relative h-full border-r border-cf-border bg-cf-card/70 backdrop-blur-xl"
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.p
              key="title"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-cf-muted"
            >
              Navigation
            </motion.p>
          ) : (
            <span />
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setCollapsed((s) => !s)}
          className="rounded-lg border border-cf-border px-2 py-1 text-xs text-cf-muted hover:bg-cf-input"
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="relative space-y-1 px-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group relative block overflow-hidden rounded-xl"
            >
              {active ? (
                <motion.span
                  layoutId="sputnik-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/25 via-indigo-500/20 to-cyan-500/20"
                  transition={{ type: "spring", stiffness: 420, damping: 35 }}
                />
              ) : null}
              <div className="relative flex items-center gap-3 px-3 py-2.5">
                <Icon
                  className={`h-4 w-4 ${active ? "text-white" : "text-cf-muted group-hover:text-cf-text"}`}
                />
                <AnimatePresence mode="wait">
                  {!collapsed ? (
                    <motion.span
                      key={item.label}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      className={`text-sm ${active ? "text-white" : "text-cf-text"}`}
                    >
                      {item.label}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
