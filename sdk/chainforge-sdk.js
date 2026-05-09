/**
 * ChainForge SDK
 * The Firebase of Web3 - Simple, powerful Web3 integration
 *
 * @example
 * import { ChainForge } from '@chainforge/sdk';
 *
 * const cf = new ChainForge({ apiKey: 'your-api-key' });
 *
 * // Auth with wallet - as simple as Firebase Auth
 * const user = await cf.auth.connectWallet('metamask');
 *
 * // Read blockchain data - no Web3 knowledge needed
 * const balance = await cf.data.getBalance(user.address);
 *
 * // Send transactions - abstracted complexity
 * await cf.transactions.send({
 *   to: '0x...',
 *   amount: '0.1 ETH'
 * });
 */

class ChainForgeSDK {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || "https://api.chainforge.io";
    this.timeout = config.timeout || 30000;

    // Initialize sub-modules
    this.auth = new AuthModule(this);
    this.data = new DataModule(this);
    this.transactions = new TransactionModule(this);
    this.wallets = new WalletModule(this);
    this.webhooks = new WebhookModule(this);

    // State
    this._user = null;
    this._token = null;
  }

  /**
   * Make authenticated API request
   */
  async _request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      ...options.headers,
    };

    if (this._token) {
      headers["Authorization"] = `Bearer ${this._token}`;
    }

    const config = {
      method,
      headers,
      ...options,
    };

    if (data && method !== "GET") {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        throw new ChainForgeError(
          result.error?.message || `HTTP ${response.status}`,
          result.error?.code || "UNKNOWN_ERROR",
          response.status,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ChainForgeError) throw error;
      throw new ChainForgeError(error.message, "NETWORK_ERROR");
    }
  }

  /**
   * Set auth token (called after successful auth)
   */
  _setAuth(token, user) {
    this._token = token;
    this._user = user;

    // Store in localStorage for persistence
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("chainforge_token", token);
      localStorage.setItem("chainforge_user", JSON.stringify(user));
    }
  }

  /**
   * Get current user
   */
  get currentUser() {
    return this._user;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated() {
    return !!this._token;
  }

  /**
   * Restore session from storage
   */
  async restoreSession() {
    if (typeof localStorage === "undefined") return false;

    const token = localStorage.getItem("chainforge_token");
    const userStr = localStorage.getItem("chainforge_user");

    if (token && userStr) {
      this._token = token;
      this._user = JSON.parse(userStr);
      return true;
    }

    return false;
  }

  /**
   * Sign out
   */
  async signOut() {
    this._token = null;
    this._user = null;

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("chainforge_token");
      localStorage.removeItem("chainforge_user");
    }
  }
}

/**
 * Custom error class
 */
class ChainForgeError extends Error {
  constructor(message, code, status = null) {
    super(message);
    this.name = "ChainForgeError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Auth Module - Wallet Authentication (like Firebase Auth)
 */
class AuthModule {
  constructor(sdk) {
    this.sdk = sdk;
    this._walletSDK = null;
  }

  /**
   * Connect wallet and authenticate
   * @param {string} walletType - 'metamask', 'phantom', 'brave', 'coinbase', 'trust'
   * @param {Object} options - { chain: 'ethereum', silent: false }
   * @returns {Promise<{user: Object, token: string}>}
   *
   * @example
   * const { user, token } = await cf.auth.connectWallet('metamask');
   * console.log(user.address); // 0x...
   * console.log(user.chain);   // ethereum
   */
  async connectWallet(walletType, options = {}) {
    const chain = options.chain || "ethereum";

    // Check if wallet is installed
    const wallet = this._detectWallet(walletType);
    if (!wallet.installed) {
      throw new ChainForgeError(
        `${wallet.name} is not installed`,
        "WALLET_NOT_INSTALLED",
      );
    }

    // Connect to wallet
    const connection = await this._connectToWallet(walletType, chain);

    // Request nonce + canonical message from backend
    const nonceResult = await this.sdk._request(
      "GET",
      `/api/auth/wallet/nonce?address=${encodeURIComponent(connection.address)}&chain=${encodeURIComponent(chain)}`,
    );

    // Ask wallet to sign the exact server-provided message
    const signature = await this._signWalletMessage(
      walletType,
      nonceResult.message,
      connection.address,
    );

    // Complete auth using compatibility endpoint
    const authResult = await this.sdk._request(
      "POST",
      "/api/client/wallet-auth",
      {
        walletAddress: connection.address,
        chain,
        signature,
        message: nonceResult.message,
      },
    );

    // Store auth
    this.sdk._setAuth(authResult.token, authResult.user);

    return {
      user: authResult.user,
      token: authResult.token,
      wallet: connection,
    };
  }

  /**
   * Login with email/password
   */
  async loginWithEmail(email, password) {
    const result = await this.sdk._request("POST", "/api/client/login", {
      email,
      password,
    });

    this.sdk._setAuth(result.token, result.user);

    return {
      user: result.user,
      token: result.token,
    };
  }

  /**
   * Sign up with email/password
   */
  async signupWithEmail(email, password, name = "") {
    const result = await this.sdk._request("POST", "/api/client/signup", {
      email,
      password,
      name,
    });

    this.sdk._setAuth(result.token, result.user);

    return {
      user: result.user,
      token: result.token,
    };
  }

  /**
   * Sign out
   */
  async signOut() {
    await this.sdk.signOut();
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.sdk.currentUser;
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.sdk.isAuthenticated;
  }

  /**
   * Auto-connect to previously used wallet
   */
  async autoConnect() {
    if (typeof localStorage === "undefined") return null;

    const saved = localStorage.getItem("chainforge_wallet");
    if (saved) {
      const { walletId, chainId } = JSON.parse(saved);
      return this.connectWallet(walletId, { chain: chainId });
    }
    return null;
  }

  _detectWallet(type) {
    const wallets = {
      metamask: {
        name: "MetaMask",
        installed: typeof window !== "undefined" && window.ethereum?.isMetaMask,
        installUrl: "https://metamask.io/download/",
      },
      phantom: {
        name: "Phantom",
        installed: typeof window !== "undefined" && !!window.solana?.isPhantom,
        installUrl: "https://phantom.app/download",
      },
      brave: {
        name: "Brave Wallet",
        installed:
          typeof window !== "undefined" && window.ethereum?.isBraveWallet,
        installUrl: "https://brave.com/wallet/",
      },
      coinbase: {
        name: "Coinbase Wallet",
        installed:
          typeof window !== "undefined" && window.ethereum?.isCoinbaseWallet,
        installUrl: "https://www.coinbase.com/wallet",
      },
    };

    return wallets[type] || { name: type, installed: false };
  }

  async _connectToWallet(type, chain) {
    // Simplified - would use ethers.js or @solana/web3.js
    // This is a placeholder for the actual implementation
    if (
      type === "metamask" &&
      typeof window !== "undefined" &&
      window.ethereum
    ) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      return {
        address: accounts[0],
        chain: chain,
        type: "evm",
      };
    }

    if (type === "phantom" && typeof window !== "undefined" && window.solana) {
      await window.solana.connect();
      return {
        address: window.solana.publicKey.toString(),
        chain: "solana",
        type: "solana",
      };
    }

    throw new ChainForgeError("Wallet connection failed", "CONNECTION_FAILED");
  }

  _bytesToBase58(bytes) {
    const alphabet =
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    if (!bytes || bytes.length === 0) return "";

    let digits = [0];
    for (let i = 0; i < bytes.length; i += 1) {
      let carry = bytes[i];
      for (let j = 0; j < digits.length; j += 1) {
        const value = digits[j] * 256 + carry;
        digits[j] = value % 58;
        carry = Math.floor(value / 58);
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }

    let result = "";
    for (let i = 0; i < bytes.length && bytes[i] === 0; i += 1) {
      result += "1";
    }
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      result += alphabet[digits[i]];
    }
    return result;
  }

  async _signWalletMessage(walletType, message, address) {
    if (!message || !address) {
      throw new ChainForgeError(
        "Missing message or address for wallet signing",
        "SIGNATURE_INPUT_MISSING",
      );
    }

    if (
      (walletType === "metamask" ||
        walletType === "brave" ||
        walletType === "coinbase") &&
      typeof window !== "undefined" &&
      window.ethereum
    ) {
      return window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });
    }

    if (
      walletType === "phantom" &&
      typeof window !== "undefined" &&
      window.solana?.signMessage
    ) {
      const encodedMessage = new TextEncoder().encode(message);
      const signed = await window.solana.signMessage(encodedMessage, "utf8");
      const signatureBytes = signed?.signature || signed;
      return this._bytesToBase58(signatureBytes);
    }

    throw new ChainForgeError(
      "Wallet does not support message signing",
      "SIGNATURE_NOT_SUPPORTED",
    );
  }
}

/**
 * Data Module - Read blockchain data (no Web3 knowledge needed)
 */
class DataModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * Get wallet balance
   * @param {string} address - Wallet address (defaults to current user)
   * @param {string} chain - Chain ID (defaults to user's chain)
   * @returns {Promise<{formatted: string, symbol: string, raw: string}>}
   *
   * @example
   * const balance = await cf.data.getBalance();
   * console.log(balance.formatted); // "1.5"
   * console.log(balance.symbol);    // "ETH"
   */
  async getBalance(address = null, chain = null) {
    const user = this.sdk.currentUser;
    const targetAddress = address || user?.walletAddress;
    const targetChain = chain || user?.chain || "ethereum";

    if (!targetAddress) {
      throw new ChainForgeError("No address provided", "MISSING_ADDRESS");
    }

    const result = await this.sdk._request(
      "GET",
      `/api/onchain/balance/${targetAddress}?chain=${targetChain}`,
    );

    return result.data.nativeBalance;
  }

  /**
   * Get transaction history
   * @param {Object} options
   * @returns {Promise<Array>} Human-readable transactions
   *
   * @example
   * const history = await cf.data.getHistory({ limit: 10 });
   * history.forEach(tx => {
   *   console.log(tx.summary); // "Sent 0.1 ETH to 0x1234..."
   * });
   */
  async getHistory(options = {}) {
    const user = this.sdk.currentUser;
    const address = options.address || user?.walletAddress;
    const chain = options.chain || user?.chain || "ethereum";
    const limit = options.limit || 20;

    if (!address) {
      throw new ChainForgeError("No address provided", "MISSING_ADDRESS");
    }

    const result = await this.sdk._request(
      "GET",
      `/api/onchain/history/${address}?chain=${chain}&limit=${limit}`,
    );

    return result.data.transactions;
  }

  /**
   * Get human-readable transaction details
   * @param {string} hash - Transaction hash
   * @param {string} chain - Chain ID
   */
  async getTransaction(hash, chain = null) {
    const targetChain = chain || this.sdk.currentUser?.chain || "ethereum";

    const result = await this.sdk._request(
      "GET",
      `/api/onchain/humanize/${hash}?chain=${targetChain}`,
    );

    return result.data;
  }

  /**
   * Sync blockchain data to ChainForge
   * @returns {Promise<{synced: number}>}
   */
  async sync() {
    const result = await this.sdk._request("POST", "/api/onchain/multisync");
    return result.data;
  }
}

/**
 * Transaction Module - Send transactions (abstracted complexity)
 */
class TransactionModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * Send a transaction
   * @param {Object} params
   * @param {string} params.to - Recipient address
   * @param {string} params.amount - Amount with unit (e.g., "0.1 ETH")
   * @param {Object} params.options - Additional options
   * @returns {Promise<{hash: string, explorer: string, wait: Function}>}
   *
   * @example
   * const tx = await cf.transactions.send({
   *   to: '0x1234...',
   *   amount: '0.1 ETH'
   * });
   * console.log(tx.hash);
   * await tx.wait(); // Wait for confirmation
   */
  async send({ to, amount, data = null, options = {} }) {
    const user = this.sdk.currentUser;

    if (!user) {
      throw new ChainForgeError("User not authenticated", "NOT_AUTHENTICATED");
    }

    // Parse amount (e.g., "0.1 ETH" -> { value: "0.1", symbol: "ETH" })
    const parsedAmount = this._parseAmount(amount);

    // Auto-estimate gas
    const gasEstimate =
      options.gasLimit || (await this._estimateGas(to, parsedAmount));

    // Send via wallet
    const tx = await this._sendViaWallet({
      to,
      value: parsedAmount,
      data,
      gasLimit: gasEstimate,
      ...options,
    });

    return {
      hash: tx.hash,
      explorer: `${this._getExplorerUrl()}/tx/${tx.hash}`,
      wait: () => this._waitForConfirmation(tx.hash),
    };
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(to, amount) {
    // Would use actual gas estimation
    return "21000"; // Default for simple transfer
  }

  _parseAmount(amount) {
    const match = amount.match(/^([\d.]+)\s*(\w+)$/);
    if (!match) {
      throw new ChainForgeError(
        'Invalid amount format. Use "0.1 ETH"',
        "INVALID_AMOUNT",
      );
    }
    return {
      value: match[1],
      symbol: match[2],
    };
  }

  async _sendViaWallet(params) {
    // Would use ethers.js or @solana/web3.js
    // Placeholder implementation
    if (typeof window !== "undefined" && window.ethereum) {
      const provider = window.ethereum.providers
        ? new window.ethereum.providers.Web3Provider(window.ethereum)
        : null;
      const signer = provider ? provider.getSigner() : null;

      if (signer) {
        const tx = await signer.sendTransaction({
          to: params.to,
          value: window.ethers?.utils.parseEther(params.value.value),
        });
        return tx;
      }
    }

    throw new ChainForgeError("Wallet not connected", "WALLET_NOT_CONNECTED");
  }

  _getExplorerUrl() {
    const chain = this.sdk.currentUser?.chain || "ethereum";
    const explorers = {
      ethereum: "https://etherscan.io",
      polygon: "https://polygonscan.com",
      bnb: "https://bscscan.com",
      solana: "https://solscan.io",
    };
    return explorers[chain] || explorers.ethereum;
  }

  async _waitForConfirmation(hash) {
    // Would poll for confirmation
    return new Promise((resolve) => {
      setTimeout(
        () => resolve({ confirmed: true, blockNumber: 12345678 }),
        3000,
      );
    });
  }
}

/**
 * Wallet Module - Manage multiple wallets
 */
class WalletModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * Get all linked wallets
   * @returns {Promise<Array>}
   */
  async getAll() {
    const result = await this.sdk._request("GET", "/api/wallets");
    return result.data.wallets;
  }

  /**
   * Link a new wallet
   * @param {Object} wallet
   */
  async link(wallet) {
    const result = await this.sdk._request("POST", "/api/wallets/link", wallet);
    return result.data;
  }

  /**
   * Unlink a wallet
   * @param {string} walletId
   */
  async unlink(walletId) {
    await this.sdk._request("DELETE", `/api/wallets/${walletId}`);
  }

  /**
   * Set primary wallet
   * @param {string} walletId
   */
  async setPrimary(walletId) {
    await this.sdk._request("PATCH", `/api/wallets/${walletId}/primary`);
  }
}

/**
 * Webhook Module - Subscribe to on-chain events
 */
class WebhookModule {
  constructor(sdk) {
    this.sdk = sdk;
    this._subscriptions = new Map();
  }

  /**
   * Subscribe to wallet events
   * @param {string} event - 'transaction', 'balance_change'
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   *
   * @example
   * const unsubscribe = cf.webhooks.on('transaction', (tx) => {
   *   console.log('New transaction:', tx.hash);
   * });
   */
  on(event, callback) {
    if (!this._subscriptions.has(event)) {
      this._subscriptions.set(event, new Set());
    }

    this._subscriptions.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this._subscriptions.get(event)?.delete(callback);
    };
  }

  /**
   * Trigger event (internal use)
   */
  _trigger(event, data) {
    this._subscriptions.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error("Webhook callback error:", e);
      }
    });
  }
}

// Export
export { ChainForgeSDK, ChainForgeError };
export default ChainForgeSDK;

// UMD build compatibility
if (typeof window !== "undefined") {
  window.ChainForge = ChainForgeSDK;
}
