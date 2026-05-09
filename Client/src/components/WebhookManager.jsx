import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Copy,
  Play,
  Pause,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Check
} from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

const EVENT_OPTIONS = [
  { id: "transaction.incoming", label: "Incoming Transaction", category: "Transactions" },
  { id: "transaction.outgoing", label: "Outgoing Transaction", category: "Transactions" },
  { id: "transaction.confirmed", label: "Transaction Confirmed", category: "Transactions" },
  { id: "transaction.failed", label: "Transaction Failed", category: "Transactions" },
  { id: "balance.change", label: "Balance Change", category: "Wallet" },
  { id: "wallet.linked", label: "Wallet Linked", category: "Wallet" },
  { id: "wallet.unlinked", label: "Wallet Unlinked", category: "Wallet" },
  { id: "api.key.created", label: "API Key Created", category: "API" },
  { id: "api.key.revoked", label: "API Key Revoked", category: "API" },
];

const STATUS_COLORS = {
  active: "text-green-500 bg-green-500/10",
  paused: "text-yellow-500 bg-yellow-500/10",
  disabled: "text-red-500 bg-red-500/10"
};

function WebhookCard({ webhook, onTest, onToggle, onDelete, onRotate }) {
  const [expanded, setExpanded] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const { showToast } = useToast();

  const handleCopySecret = () => {
    // In real implementation, would need to fetch or have secret stored
    showToast("Secret copied (in production)", "success");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-cf-border bg-cf-card overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${STATUS_COLORS[webhook.status]}`}>
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-cf-text">
                {webhook.label || "Webhook"}
              </h3>
              <p className="text-sm text-cf-muted truncate max-w-xs">
                {webhook.url}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[webhook.status]}`}>
              {webhook.status}
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-lg text-cf-muted hover:bg-cf-input hover:text-cf-text"
            >
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Stats preview */}
        <div className="mt-3 flex items-center gap-4 text-xs text-cf-muted">
          <span>{webhook.events.length} events</span>
          <span>•</span>
          <span className="text-green-500">{webhook.stats.successfulDeliveries} delivered</span>
          {webhook.stats.failedDeliveries > 0 && (
            <>
              <span>•</span>
              <span className="text-red-500">{webhook.stats.failedDeliveries} failed</span>
            </>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="border-t border-cf-border bg-cf-input"
          >
            <div className="p-4 space-y-4">
              {/* Events */}
              <div>
                <p className="text-xs font-medium text-cf-muted uppercase mb-2">Subscribed Events</p>
                <div className="flex flex-wrap gap-2">
                  {webhook.events.map(event => (
                    <span 
                      key={event} 
                      className="px-2 py-1 rounded-lg bg-cf-card text-xs text-cf-text border border-cf-border"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onTest(webhook.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cf-border text-xs font-medium text-cf-text hover:bg-cf-card"
                >
                  <Play className="h-3 w-3" />
                  Test
                </button>
                
                <button
                  onClick={() => onToggle(webhook.id, webhook.status === "active" ? "paused" : "active")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cf-border text-xs font-medium text-cf-text hover:bg-cf-card"
                >
                  {webhook.status === "active" ? (
                    <><Pause className="h-3 w-3" /> Pause</>
                  ) : (
                    <><Play className="h-3 w-3" /> Resume</>
                  )}
                </button>

                <button
                  onClick={() => onRotate(webhook.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cf-border text-xs font-medium text-cf-text hover:bg-cf-card"
                >
                  <RefreshCw className="h-3 w-3" />
                  Rotate Secret
                </button>

                <button
                  onClick={() => onDelete(webhook.id)}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CreateWebhookModal({ open, onClose, onCreate }) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  if (!open) return null;

  const toggleEvent = (eventId) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEvents.length === 0) {
      showToast("Select at least one event", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({ url, label, events: selectedEvents });
      setUrl("");
      setLabel("");
      setSelectedEvents([]);
      onClose();
    } catch (e) {
      showToast("Failed to create webhook", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group events by category
  const eventsByCategory = EVENT_OPTIONS.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-cf-border bg-cf-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-cf-text">Create Webhook</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-cf-muted hover:bg-cf-input">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cf-text mb-1">Endpoint URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/webhook"
              required
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-cf-text focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cf-text mb-1">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Production webhook"
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-cf-text focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cf-text mb-2">Events to Subscribe</label>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {Object.entries(eventsByCategory).map(([category, events]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-cf-muted uppercase mb-2">{category}</p>
                  <div className="space-y-1">
                    {events.map(event => (
                      <label 
                        key={event.id} 
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-cf-input cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="rounded border-cf-border text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-cf-text">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-cf-border">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              Create Webhook
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/webhooks");
      setWebhooks(res.data.webhooks);
    } catch (e) {
      showToast("Failed to load webhooks", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      const res = await api.post("/api/webhooks", data);
      showToast("Webhook created! Save your secret.", "success");
      await loadWebhooks();
      // Would show secret modal here in production
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to create", "error");
      throw e;
    }
  };

  const handleTest = async (id) => {
    try {
      const res = await api.post(`/api/webhooks/${id}/test`);
      if (res.data.result.success) {
        showToast("Test delivered successfully!", "success");
      } else {
        showToast(`Test failed: ${res.data.result.error}`, "error");
      }
    } catch (e) {
      showToast("Test failed", "error");
    }
  };

  const handleToggle = async (id, status) => {
    try {
      await api.patch(`/api/webhooks/${id}`, { status });
      showToast(`Webhook ${status === "active" ? "resumed" : "paused"}`, "success");
      await loadWebhooks();
    } catch (e) {
      showToast("Failed to update", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
      await api.delete(`/api/webhooks/${id}`);
      showToast("Webhook deleted", "success");
      await loadWebhooks();
    } catch (e) {
      showToast("Failed to delete", "error");
    }
  };

  const handleRotate = async (id) => {
    if (!confirm("Rotate secret? The old secret will stop working immediately.")) return;
    try {
      const res = await api.post(`/api/webhooks/${id}/rotate-secret`);
      showToast("Secret rotated! Save the new secret.", "success");
      // Would show new secret in production
    } catch (e) {
      showToast("Failed to rotate secret", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cf-text">Webhooks</h2>
          <p className="text-cf-muted">
            Get real-time blockchain events delivered to your backend
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"
        >
          <Plus className="h-5 w-5" />
          Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cf-border bg-cf-card p-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cf-input">
            <Webhook className="h-8 w-8 text-cf-muted" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-cf-text">No webhooks yet</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-cf-muted">
            Create webhooks to receive real-time notifications for transactions, balance changes, and more
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-5 w-5" />
            Create Your First Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {webhooks.map(webhook => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                onTest={handleTest}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onRotate={handleRotate}
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
            <h4 className="font-medium text-cf-text">How webhooks work</h4>
            <ul className="mt-2 space-y-1 text-sm text-cf-muted">
              <li>• We send HTTP POST requests to your endpoint when events occur</li>
              <li>• Each webhook includes a signature for verification</li>
              <li>• Failed deliveries are retried up to 3 times with exponential backoff</li>
              <li>• Webhooks auto-disable after 90% failure rate</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <CreateWebhookModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
