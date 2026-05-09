import axios from "axios";
import { adminApiPath, adminConsolePath } from "./adminPaths.js";

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export function setAuthHeader(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// ——— Response interceptor for auto-logout on 401 ———
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const usedAuthHeader = Boolean(
      error.config?.headers?.Authorization ||
      error.config?.headers?.authorization,
    );
    if (error.response?.status === 401 && usedAuthHeader) {
      // Token expired or invalid — clear auth
      const stored = localStorage.getItem("chainforge_auth");
      if (stored) {
        let role = null;
        try {
          role = JSON.parse(stored)?.role || null;
        } catch {
          role = null;
        }
        localStorage.removeItem("chainforge_auth");
        // Redirect only if not already on an auth page
        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/signup")
        ) {
          window.location.href =
            role === "admin" ? adminConsolePath("/login") : "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

/* ——————————————————————
   API helper functions
   —————————————————————— */

// Client stats
export const fetchStats = () => api.get("/api/data/stats").then((r) => r.data);
export const fetchMe = () => api.get("/api/data/me").then((r) => r.data);

// Client transactions
export const fetchTransactions = (params = {}) =>
  api.get("/api/data/transactions", { params }).then((r) => r.data);

// API Keys
export const fetchApiKeys = () => api.get("/api/keys").then((r) => r.data);
export const generateApiKey = (label = "", scopes = ["read:balance"], walletId = null) =>
  api.post("/api/keys/generate", { label, scopes, walletId }).then((r) => r.data);
export const revokeApiKey = (id) =>
  api.patch(`/api/keys/${id}/revoke`).then((r) => r.data);
export const rotateApiKey = (id) =>
  api.post(`/api/keys/${id}/rotate`).then((r) => r.data);

// Usage / analytics
export const fetchUsageSummary = (params = {}) =>
  api.get("/api/data/usage/summary", { params }).then((r) => r.data);
export const fetchAdminUsageSummary = (params = {}) =>
  api.get("/api/data/admin/usage/summary", { params }).then((r) => r.data);

// Admin overview
export const fetchAdminOverview = () =>
  api.get("/api/data/admin/overview").then((r) => r.data);

// Admin users
export const fetchAdminUsers = (params = {}) =>
  api.get("/api/data/admin/users", { params }).then((r) => r.data);

// Admin transactions
export const fetchAdminTransactions = (params = {}) =>
  api.get("/api/data/admin/transactions", { params }).then((r) => r.data);

// Admin chain stats
export const fetchAdminChainStats = () =>
  api.get("/api/data/admin/chain-stats").then((r) => r.data);

// Admin analytics
export const fetchAdminChainVolume = (params = {}) =>
  api
    .get("/api/data/admin/analytics/chain-volume", { params })
    .then((r) => r.data);

export const fetchAdminChainGrowth = (params = {}) =>
  api
    .get("/api/data/admin/analytics/chain-growth", { params })
    .then((r) => r.data);

export const fetchAdminUserAcquisition = (params = {}) =>
  api
    .get("/api/data/admin/analytics/user-acquisition", { params })
    .then((r) => r.data);

export const fetchAdminApiKeyUsage = (params = {}) =>
  api
    .get("/api/data/admin/analytics/api-key-usage", { params })
    .then((r) => r.data);

// Admin API keys (all platform keys, masked)
export const fetchAdminApiKeys = (params = {}) =>
  api.get("/api/data/admin/api-keys", { params }).then((r) => r.data);

export const adminGenerateApiKey = (data) =>
  api.post("/api/data/admin/api-keys/generate", data).then((r) => r.data);

export const adminRotateApiKey = (id) =>
  api.post(`/api/data/admin/api-keys/${id}/rotate`).then((r) => r.data);

export const adminRevokeApiKey = (id) =>
  api.patch(`/api/data/admin/api-keys/${id}/revoke`).then((r) => r.data);

// Admin user status
export const updateUserStatus = (id, status) =>
  api
    .patch(`/api/data/admin/users/${id}/status`, { status })
    .then((r) => r.data);

// Admin codes
export const fetchAdminCodes = () =>
  api.get("/api/admin/mgmt/codes").then((r) => r.data);
export const generateAdminCode = () =>
  api.post(adminApiPath("/mgmt/codes/generate")).then((r) => r.data);

export const fetchAdminUsersMgmt = () =>
  api.get(adminApiPath("/mgmt/users")).then((r) => r.data);

export const updateUserStatusMgmt = (id, status) =>
  api.patch(adminApiPath(`/mgmt/users/${id}/status`), { status }).then((r) => r.data);

export const adminLoginInitiate = (payload) =>
  api.post(adminApiPath("/login/initiate"), payload).then((r) => r.data);
export const adminLoginVerify = (payload) =>
  api.post(adminApiPath("/login/verify"), payload).then((r) => r.data);
export const adminSignupInitiate = (payload) =>
  api.post(adminApiPath("/signup/initiate"), payload).then((r) => r.data);
export const adminSignupVerify = (payload) =>
  api.post(adminApiPath("/signup/verify"), payload).then((r) => r.data);

export const adminLogin = (payload) => adminLoginVerify(payload);
export const adminSignup = (payload) => adminSignupInitiate(payload);

// Health check
export const checkHealth = () => api.get("/health").then((r) => r.data);

// Wallet management
export const fetchWallets = () => api.get("/api/wallets").then((r) => r.data);
export const linkWallet = (data) =>
  api.post("/api/wallets/link", data).then((r) => r.data);
export const unlinkWallet = (id) =>
  api.delete(`/api/wallets/${id}`).then((r) => r.data);
export const setPrimaryWallet = (id) =>
  api.patch(`/api/wallets/${id}/primary`).then((r) => r.data);
export const updateWalletLabel = (id, label) =>
  api.patch(`/api/wallets/${id}/label`, { label }).then((r) => r.data);

// On-chain data
export const fetchOnChainHistory = (address, chain, params = {}) =>
  api
    .get(`/api/onchain/history/${address}`, { params: { chain, ...params } })
    .then((r) => r.data);
export const fetchOnChainBalance = (address, chain) =>
  api
    .get(`/api/onchain/balance/${address}`, { params: { chain } })
    .then((r) => r.data);
export const syncTransactions = (address, chain) =>
  api.post("/api/onchain/sync", { address, chain }).then((r) => r.data);
export const multiSync = () =>
  api.post("/api/onchain/multisync").then((r) => r.data);

// Webhooks
export const fetchWebhooks = () => api.get("/api/webhooks").then((r) => r.data);
export const createWebhook = (data) =>
  api.post("/api/webhooks", data).then((r) => r.data);
export const deleteWebhook = (id) =>
  api.delete(`/api/webhooks/${id}`).then((r) => r.data);
export const testWebhook = (id) =>
  api.post(`/api/webhooks/${id}/test`).then((r) => r.data);

export default api;
