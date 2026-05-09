import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { CHAINS } from "../constants/chains.js";
import { api } from "../lib/api.js";

export default function ChainSelector({ activeId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(0);
  const [gasByChain, setGasByChain] = useState({});

  useEffect(() => {
    const onShortcut = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    const fetchGas = async () => {
      const entries = await Promise.all(
        CHAINS.map(async (c) => {
          try {
            const r = await api.get("/api/onchain/gas", { params: { chain: c.id } });
            return [c.id, r.data?.data?.gasPrice || c.rpcLabel];
          } catch {
            return [c.id, c.rpcLabel];
          }
        }),
      );
      setGasByChain(Object.fromEntries(entries));
    };
    fetchGas();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return CHAINS;
    return CHAINS.filter((c) =>
      `${c.name} ${c.id} ${c.symbol}`.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    setFocused(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onNav = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocused((f) => Math.min(f + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocused((f) => Math.max(0, f - 1));
      } else if (e.key === "Enter" && filtered[focused]) {
        onSelect(filtered[focused].id);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onNav);
    return () => window.removeEventListener("keydown", onNav);
  }, [open, filtered, focused, onSelect]);

  const active = CHAINS.find((c) => c.id === activeId) || CHAINS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl border border-cf-border bg-cf-card px-3 py-2 text-left hover:border-purple-500/40"
      >
        <img src={active.logoUrl} alt={active.name} className="h-7 w-7 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-cf-text">{active.name}</p>
          <p className="truncate text-[11px] text-cf-muted">Press / to search chains</p>
        </div>
        <span className="rounded-md bg-cf-input px-2 py-0.5 text-[10px] text-cf-muted">
          {active.symbol}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute z-[100] mt-2 w-full overflow-hidden rounded-xl border border-cf-border bg-cf-card shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-cf-border px-3 py-2">
              <Search className="h-4 w-4 text-cf-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chain..."
                className="w-full bg-transparent text-sm text-cf-text outline-none"
              />
            </div>
            <div className="max-h-72 overflow-auto p-1">
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${
                    i === focused ? "bg-purple-500/10" : "hover:bg-cf-input"
                  }`}
                >
                  <img src={c.logoUrl} alt={c.name} className="h-6 w-6 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cf-text">{c.name}</p>
                    <p className="truncate text-[10px] text-cf-muted">
                      gas: {String(gasByChain[c.id] || c.rpcLabel).slice(0, 22)}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase text-cf-muted">{c.type}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
