import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Copy,
  Edit2,
  X,
  Check,
  Loader2,
  Link2
} from "lucide-react";
import { walletApi } from "../lib/walletApi.js";
import { CHAIN_CONFIG } from "../lib/walletSDK.js";
import WalletModalV2 from "./WalletModalV2.jsx";
import { useToast } from "../context/ToastContext.jsx";

const CHAIN_ICONS = {
  ethereum: "🔷",
  polygon: "💜",
  bnb: "🟡",
  avalanche: "🔺",
  arbitrum: "🔵",
  optimism: "🔴",
  solana: "🟣"
};

function WalletCard({ wallet, isPrimary, onSetPrimary, onUnlink, onUpdateLabel }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(wallet.label);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSaveLabel = async () => {
    if (label === wallet.label) {
      setIsEditing(false);
      return;
    }
    
    setIsLoading(true);
    try {
      await onUpdateLabel(wallet.id, label);
      setIsEditing(false);
      showToast("Wallet label updated", "success");
    } catch (e) {
      setLabel(wallet.label);
      showToast("Failed to update label", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    showToast("Address copied to clipboard", "success");
  };

  const chainConfig = CHAIN_CONFIG[wallet.chain];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-xl border p-4 transition-all ${
        isPrimary 
          ? "border-purple-500/50 bg-purple-500/5" 
          : "border-cf-border bg-cf-card hover:border-cf-border/80"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: chainConfig?.color + '20' || '#ccc' }}
          >
            {CHAIN_ICONS[wallet.chain] || "💼"}
          </div>
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
                  className="w-32 rounded-lg border border-cf-border bg-cf-input px-2 py-1 text-sm text-cf-text focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveLabel}
                  disabled={isLoading}
                  className="rounded-lg p-1 text-green-500 hover:bg-green-500/10"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setLabel(wallet.label);
                    setIsEditing(false);
                  }}
                  className="rounded-lg p-1 text-red-500 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-cf-text">
                  {wallet.label || `${wallet.chain} Wallet`}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded p-1 text-cf-muted opacity-0 transition-opacity hover:bg-cf-input hover:text-cf-text group-hover:opacity-100"
                  style={{ opacity: isEditing ? 0 : undefined }}
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <p className="text-sm text-cf-muted">{wallet.shortAddress}</p>
              {wallet.balance ? (
                <span className="rounded-md bg-cf-input px-2 py-0.5 text-[10px] text-cf-text">
                  {wallet.balance.formatted} {wallet.balance.symbol}
                </span>
              ) : null}
              <button
                onClick={handleCopyAddress}
                className="rounded p-1 text-cf-muted hover:bg-cf-input hover:text-cf-text"
                title="Copy address"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isPrimary && (
            <span className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-500">
              <Star className="h-3 w-3 fill-current" />
              Primary
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {!isPrimary && (
          <button
            onClick={() => onSetPrimary(wallet.id)}
            className="flex items-center gap-1 rounded-lg border border-cf-border px-3 py-1.5 text-xs font-medium text-cf-muted transition-colors hover:border-purple-500 hover:text-purple-500"
          >
            <Star className="h-3 w-3" />
            Set Primary
          </button>
        )}
        
        <a
          href={`${chainConfig?.explorer}/address/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg border border-cf-border px-3 py-1.5 text-xs font-medium text-cf-muted transition-colors hover:border-cf-border hover:text-cf-text"
        >
          <ExternalLink className="h-3 w-3" />
          Explorer
        </a>

        {!isPrimary && (
          <button
            onClick={() => onUnlink(wallet.id)}
            className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3 w-3" />
            Unlink
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function WalletManager() {
  const [wallets, setWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const { showToast } = useToast();

  // Fetch wallets on mount
  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setIsLoading(true);
      const data = await walletApi.fetchWallets();
      const rows = data.wallets || [];
      const withBalances = await Promise.all(
        rows.map(async (w) => {
          try {
            const balance = await walletApi.fetchWalletBalance(w.address, w.chain);
            return { ...w, balance };
          } catch {
            return { ...w, balance: null };
          }
        }),
      );
      setWallets(withBalances);
      setError(null);
    } catch (e) {
      setError("Failed to load wallets");
      showToast("Failed to load wallets", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (walletId) => {
    try {
      await walletApi.setPrimaryWallet(walletId);
      await loadWallets();
      showToast("Primary wallet updated", "success");
    } catch (e) {
      showToast("Failed to update primary wallet", "error");
    }
  };

  const handleUnlink = async (walletId) => {
    if (!window.confirm("Are you sure you want to unlink this wallet?")) return;
    
    try {
      await walletApi.unlinkWallet(walletId);
      await loadWallets();
      showToast("Wallet unlinked", "success");
    } catch (e) {
      showToast("Failed to unlink wallet", "error");
    }
  };

  const handleUpdateLabel = async (walletId, label) => {
    await walletApi.updateWalletLabel(walletId, label);
    await loadWallets();
  };

  const handleWalletConnected = async (result) => {
    setIsLinking(true);
    try {
      await walletApi.linkWallet({
        address: result.address,
        chain: result.chain?.id || result.chain,
        type:
          result.chain?.type ||
          (result.chain === "solana"
            ? "solana"
            : result.chain === "sui"
              ? "sui"
              : result.chain === "bitcoin"
                ? "bitcoin"
                : "evm"),
        label: `${result.wallet?.name || 'Wallet'} ${wallets.length + 1}`
      });
      await loadWallets();
      showToast("Wallet linked successfully", "success");
      setShowAddModal(false);
    } catch (e) {
      if (e.response?.status === 409) {
        showToast("Wallet already linked to this account", "error");
      } else {
        showToast("Failed to link wallet", "error");
      }
    } finally {
      setIsLinking(false);
    }
  };

  const primaryWallet = wallets.find(w => w.isPrimary);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cf-text">Wallet Management</h2>
          <p className="text-cf-muted">
            Manage your linked wallets across different chains
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700"
        >
          <Plus className="h-5 w-5" />
          Link Wallet
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-cf-border bg-cf-card p-4">
          <p className="text-sm text-cf-muted">Total Wallets</p>
          <p className="text-2xl font-bold text-cf-text">{wallets.length}</p>
        </div>
        <div className="rounded-xl border border-cf-border bg-cf-card p-4">
          <p className="text-sm text-cf-muted">EVM Chains</p>
          <p className="text-2xl font-bold text-cf-text">
            {wallets.filter(w => w.type === 'evm').length}
          </p>
        </div>
        <div className="rounded-xl border border-cf-border bg-cf-card p-4">
          <p className="text-sm text-cf-muted">Solana</p>
          <p className="text-2xl font-bold text-cf-text">
            {wallets.filter(w => w.type === 'solana').length}
          </p>
        </div>
      </div>

      {/* Wallets List */}
      {wallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cf-border bg-cf-card p-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cf-input">
            <Wallet className="h-8 w-8 text-cf-muted" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-cf-text">No wallets linked</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-cf-muted">
            Link your crypto wallets to enable seamless authentication and transaction tracking
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700"
          >
            <Link2 className="h-5 w-5" />
            Link Your First Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                isPrimary={wallet.isPrimary}
                onSetPrimary={handleSetPrimary}
                onUnlink={handleUnlink}
                onUpdateLabel={handleUpdateLabel}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Card */}
      <div className="rounded-xl border border-cf-border bg-cf-input p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
          <div>
            <h4 className="font-medium text-cf-text">Why link multiple wallets?</h4>
            <ul className="mt-2 space-y-1 text-sm text-cf-muted">
              <li>• Use any wallet to log in to your account</li>
              <li>• Track transactions across all chains in one place</li>
              <li>• Set a primary wallet for default operations</li>
              <li>• Switch between chains without creating new accounts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Wallet Modal */}
      <WalletModalV2
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConnected={handleWalletConnected}
        mode="link"
      />
    </div>
  );
}
