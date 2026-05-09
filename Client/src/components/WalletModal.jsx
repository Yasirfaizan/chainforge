import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrowserProvider } from "ethers";
import { X } from "lucide-react";
import { CHAINS } from "../constants/chains.js";

export default function WalletModal({ open, onClose, onConnected }) {
  const [step, setStep] = useState("chain");
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setStep("chain");
      setSelected(null);
      setErr("");
    }
  }, [open]);

  async function connectWallet() {
    setErr("");
    if (!selected) return;
    try {
      if (selected.evm) {
        if (!window.ethereum) {
          throw new Error("Install MetaMask for EVM chains");
        }
        const provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        onConnected?.({ address, chainId: selected.id });
        onClose();
      } else {
        const phantom = window.solana;
        if (!phantom) {
          throw new Error("Install Phantom for Solana");
        }
        await phantom.connect();
        const pk = phantom.publicKey;
        if (!pk) throw new Error("No public key returned");
        const address = pk.toString();
        onConnected?.({ address, chainId: selected.id });
        onClose();
      }
    } catch (e) {
      setErr(e?.message || "Connection failed");
    }
  }

  const walletLabel = selected?.evm ? "MetaMask" : "Phantom";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            className="relative z-10 w-full max-w-lg rounded-xl border border-cf-border bg-cf-card p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-cf-text">
                {step === "chain" ? "Select chain" : `Connect ${walletLabel}`}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-cf-muted hover:bg-cf-input hover:text-cf-text"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step === "chain" && (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      setStep("connect");
                    }}
                    className="flex items-center gap-3 rounded-lg border border-cf-border bg-cf-input px-3 py-3 text-left transition hover:border-purple-500 dark:hover:border-purple-600"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <div>
                      <p className="font-medium text-cf-text">{c.name}</p>
                      <p className="text-xs text-cf-muted">
                        {c.evm ? "MetaMask" : "Phantom"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === "connect" && selected && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-cf-muted">
                  Connecting to{" "}
                  <span className="text-cf-text">{selected.name}</span> via{" "}
                  <span className="text-purple-600 dark:text-purple-300">
                    {walletLabel}
                  </span>
                </p>
                {err && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {err}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("chain")}
                    className="rounded-lg border border-cf-border px-4 py-2 text-sm text-cf-muted hover:bg-cf-input hover:text-cf-text"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={connectWallet}
                    className="rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-medium text-on-surface hover:bg-[#6d28d9]"
                  >
                    Connect wallet
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
