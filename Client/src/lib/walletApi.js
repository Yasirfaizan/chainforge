/**
 * ChainForge Wallet API Client
 * Simple Web2-style API for managing wallets
 */

import { api } from "./api.js";

/**
 * Get all linked wallets for the current user
 * @returns {Promise<{wallets: Array, primaryWalletId: string, preferences: Object}>}
 */
export const fetchWallets = () => 
  api.get("/api/wallets").then((r) => r.data);

/**
 * Link a new wallet to the user account
 * @param {Object} walletData
 * @param {string} walletData.address - Wallet address
 * @param {string} walletData.chain - Chain ID (ethereum, solana, etc.)
 * @param {string} walletData.type - Wallet type (evm, solana)
 * @param {string} [walletData.label] - Optional custom label
 * @returns {Promise<{message: string, wallet: Object}>}
 */
export const linkWallet = (walletData) =>
  api.post("/api/wallets/link", walletData).then((r) => r.data);

/**
 * Unlink a wallet from the user account
 * @param {string} walletId - The wallet ID to unlink
 * @returns {Promise<{message: string}>}
 */
export const unlinkWallet = (walletId) =>
  api.delete(`/api/wallets/${walletId}`).then((r) => r.data);

/**
 * Set a wallet as the primary wallet
 * @param {string} walletId - The wallet ID to set as primary
 * @returns {Promise<{message: string, primaryWallet: Object}>}
 */
export const setPrimaryWallet = (walletId) =>
  api.patch(`/api/wallets/${walletId}/primary`).then((r) => r.data);

/**
 * Update wallet label
 * @param {string} walletId - The wallet ID
 * @param {string} label - New label
 * @returns {Promise<{message: string, wallet: Object}>}
 */
export const updateWalletLabel = (walletId, label) =>
  api.patch(`/api/wallets/${walletId}/label`, { label }).then((r) => r.data);

/**
 * Get wallet balance
 * @param {string} address - Wallet address
 * @param {string} chain - Chain ID
 * @returns {Promise<Object>}
 */
export const fetchWalletBalance = (address, chain) =>
  api.get(`/api/wallets/${address}/balance`, { params: { chain } }).then((r) => r.data);

/**
 * Get supported chains and wallet types
 * @returns {Promise<{chains: Array, walletTypes: Array}>}
 */
export const fetchSupportedWallets = () =>
  api.get("/api/wallets/supported/list").then((r) => r.data);

/**
 * Convenient hook-like object for wallet operations
 * Usage: walletApi.fetchWallets(), walletApi.linkWallet(data), etc.
 */
export const walletApi = {
  fetchWallets,
  linkWallet,
  unlinkWallet,
  setPrimaryWallet,
  updateWalletLabel,
  fetchWalletBalance,
  fetchSupportedWallets,
};

export default walletApi;
