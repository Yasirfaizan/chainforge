import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import SoundToggle from "./SoundToggle.jsx";

export default function ClientNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Transactions", path: "/transactions" },
    { name: "Wallets", path: "/wallets" },
    { name: "Docs", path: "/docs" },
  ];

  return (
    <nav className="sticky top-0 w-full z-[1000] bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-center h-16 px-6 max-w-full gap-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 min-w-0"
        >
          <span className="text-xl">⛓️</span>
          <span className="text-xl font-extrabold tracking-tighter text-on-surface truncate">
            ChainForge Client
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              className={`pb-1 font-sans text-sm font-medium tracking-tight transition-all ${
                location.pathname === link.path 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              to={link.path}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline text-xs text-on-surface-variant font-mono tracking-wider">
            {user?.email || "Client"}
          </span>
          <SoundToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 border border-outline-variant/40 text-on-surface font-sans text-sm font-medium tracking-tight hover:bg-surface-container-high active:scale-95 transition-all rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
