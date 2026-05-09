import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import SoundToggle from "./SoundToggle.jsx";
import { adminConsolePath } from "../lib/adminPaths.js";

export default function AdminNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(adminConsolePath("/login"));
  };

  return (
    <nav className="sticky top-0 w-full z-40 bg-surface/90 backdrop-blur-xl border-b border-red-500/20 shadow-sm dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-center h-16 px-6 max-w-full gap-4">
        <Link
          to={adminConsolePath("/dashboard/overview")}
          className="flex items-center gap-2 min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">CF</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-on-surface truncate">
            Admin Console
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          <Link
            className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
            to={adminConsolePath("/dashboard/overview")}
          >
            Overview
          </Link>
          <Link
            className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
            to={adminConsolePath("/dashboard/users")}
          >
            Users
          </Link>
          <Link
            className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
            to={adminConsolePath("/dashboard/transactions")}
          >
            Transactions
          </Link>
          <Link
            className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
            to={adminConsolePath("/dashboard/settings")}
          >
            Settings
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline text-[11px] uppercase tracking-widest text-red-600 dark:text-red-400 font-bold">
            {user?.name || "Admin"}
          </span>
          <SoundToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium tracking-tight hover:bg-red-500/10 active:scale-95 transition-all rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
