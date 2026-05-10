import { BrowserProvider, formatEther } from "ethers";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import EthereumProvider from "@walletconnect/ethereum-provider";
import bs58 from "bs58";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import AppEth from "@ledgerhq/hw-app-eth";

const WALLET_STATE = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
};

const CHAIN_CONFIG = {
  ethereum: { id: 1, name: "Ethereum", symbol: "ETH", decimals: 18, rpc: "https://eth.llamarpc.com", explorer: "https://etherscan.io", color: "#627EEA", type: "evm", gasBadge: "high" },
  polygon: { id: 137, name: "Polygon", symbol: "POL", decimals: 18, rpc: "https://polygon.llamarpc.com", explorer: "https://polygonscan.com", color: "#8247E5", type: "evm", gasBadge: "low" },
  bnb: { id: 56, name: "BNB Chain", symbol: "BNB", decimals: 18, rpc: "https://binance.llamarpc.com", explorer: "https://bscscan.com", color: "#F3BA2F", type: "evm", gasBadge: "low" },
  avalanche: { id: 43114, name: "Avalanche", symbol: "AVAX", decimals: 18, rpc: "https://avalanche.llamarpc.com", explorer: "https://snowtrace.io", color: "#E84142", type: "evm", gasBadge: "low" },
  arbitrum: { id: 42161, name: "Arbitrum", symbol: "ETH", decimals: 18, rpc: "https://arbitrum.llamarpc.com", explorer: "https://arbiscan.io", color: "#28A0F0", type: "evm", gasBadge: "low" },
  optimism: { id: 10, name: "Optimism", symbol: "ETH", decimals: 18, rpc: "https://optimism.llamarpc.com", explorer: "https://optimistic.etherscan.io", color: "#FF0420", type: "evm", gasBadge: "low" },
  base: { id: 8453, name: "Base", symbol: "ETH", decimals: 18, rpc: "https://mainnet.base.org", explorer: "https://basescan.org", color: "#0052FF", type: "evm", gasBadge: "low" },
  zksync: { id: 324, name: "zkSync", symbol: "ETH", decimals: 18, rpc: "https://mainnet.era.zksync.io", explorer: "https://era.zksync.network", color: "#8C8DFC", type: "evm", gasBadge: "low" },
  linea: { id: 59144, name: "Linea", symbol: "ETH", decimals: 18, rpc: "https://rpc.linea.build", explorer: "https://lineascan.build", color: "#121212", type: "evm", gasBadge: "low" },
  solana: { id: "mainnet-beta", name: "Solana", symbol: "SOL", decimals: 9, rpc: "https://api.mainnet-beta.solana.com", explorer: "https://solscan.io", color: "#14F195", type: "solana", gasBadge: "very-low" },
  sui: { id: 784, name: "Sui", symbol: "SUI", decimals: 9, rpc: "https://fullnode.mainnet.sui.io:443", explorer: "https://suivision.xyz", color: "#4DA2FF", type: "sui", gasBadge: "very-low" },
  bitcoin: { id: 0, name: "Bitcoin", symbol: "BTC", decimals: 8, rpc: "https://mempool.space/api", explorer: "https://mempool.space", color: "#F7931A", type: "bitcoin", gasBadge: "medium" },
};

class WalletEventEmitter {
  constructor() {
    this.events = {};
  }
  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
    return () => this.off(event, callback);
  }
  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach((cb) => {
      try {
        cb(data);
      } catch {
        // ignore
      }
    });
  }
}

function getEip6963Providers() {
  const providers = window.ethereum?.providers || (window.ethereum ? [window.ethereum] : []);
  return providers;
}

function pickInjectedProvider(walletId) {
  const providers = getEip6963Providers();
  if (!providers.length) return window.ethereum || null;
  const byWallet = {
    metamask: (p) => p.isMetaMask && !p.isBraveWallet && !p.isRabby,
    brave: (p) => p.isBraveWallet,
    coinbase: (p) => p.isCoinbaseWallet,
    trust: (p) => p.isTrust || p.isTrustWallet,
    okx: (p) => p.isOkxWallet || p.isOKExWallet,
    rabby: (p) => p.isRabby,
    rainbow: (p) => p.isRainbow,
    phantom: (p) => p.isPhantom,
    backpack: (p) => p.isBackpack || p.isBackpackEVM,
  };
  const picker = byWallet[walletId];
  if (!picker) return providers[0];
  return providers.find((p) => picker(p)) || providers[0];
}

function isInstalled(id) {
  if (id === "walletconnect") return true;
  if (id === "ledger") return typeof navigator !== "undefined" && ("hid" in navigator || "usb" in navigator);
  if (id === "phantom") return Boolean(window.solana?.isPhantom || window.phantom?.solana);
  if (id === "backpack") return Boolean(window.backpack?.solana || window.solana?.isBackpack);
  if (id === "suiWallet") return Boolean(window.suiWallet || window.sui);
  return Boolean(pickInjectedProvider(id));
}

const SUPPORTED_WALLETS = {
  metamask: { id: "metamask", name: "MetaMask", icon: "/wallets/metamask.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "evm", installUrl: "https://metamask.io/download/" },
  phantom: { id: "phantom", name: "Phantom", icon: "/wallets/phantom.svg", chains: ["solana","ethereum","polygon","bnb","base"], type: "multi", installUrl: "https://phantom.app/download" },
  brave: { id: "brave", name: "Brave Wallet", icon: "/wallets/brave.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "evm", installUrl: "https://brave.com/wallet/" },
  coinbase: { id: "coinbase", name: "Coinbase Wallet", icon: "/wallets/coinbase.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "evm", installUrl: "https://www.coinbase.com/wallet" },
  trust: { id: "trust", name: "Trust Wallet", icon: "/wallets/trust.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "evm", installUrl: "https://trustwallet.com/" },
  okx: { id: "okx", name: "OKX Wallet", icon: "/wallets/okx.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "evm", installUrl: "https://www.okx.com/web3" },
  rabby: { id: "rabby", name: "Rabby", icon: "/wallets/rabby.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "evm", installUrl: "https://rabby.io/" },
  rainbow: { id: "rainbow", name: "Rainbow", icon: "/wallets/rainbow.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "evm", installUrl: "https://rainbow.me/" },
  walletconnect: { id: "walletconnect", name: "WalletConnect", icon: "/wallets/walletconnect.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "multi", installUrl: "https://walletconnect.com/" },
  ledger: { id: "ledger", name: "Ledger", icon: "/wallets/ledger.svg", chains: ["ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea","solana","bitcoin"], type: "multi", installUrl: "https://www.ledger.com/" },
  backpack: { id: "backpack", name: "Backpack", icon: "/wallets/backpack.svg", chains: ["solana","ethereum","polygon","bnb","avalanche","arbitrum","optimism","base","zksync","linea"], type: "multi", installUrl: "https://backpack.app/" },
  suiWallet: { id: "suiWallet", name: "Sui Wallet", icon: "/wallets/suiwallet.svg", chains: ["sui"], type: "sui", installUrl: "https://suiwallet.com/" },
};

class ChainForgeWalletSDK {
  constructor() {
    this.emitter = new WalletEventEmitter();
    this.state = WALLET_STATE.IDLE;
    this.connectedWallet = null;
    this.connectedChain = null;
    this.address = null;
    this.provider = null;
    this.signer = null;
    this.walletConnectProvider = null;
    this.ledgerEth = null;
  }

  on(event, callback) {
    return this.emitter.on(event, callback);
  }

  getWalletConflicts() {
    const providers = getEip6963Providers();
    return providers.length > 1
      ? { hasConflict: true, count: providers.length, brands: providers.map((p) => Object.keys(p).filter((k) => k.startsWith("is") && p[k])) }
      : { hasConflict: false, count: providers.length, brands: [] };
  }

  detectWallets() {
    return Object.values(SUPPORTED_WALLETS)
      .map((w) => ({
        ...w,
        installed: isInstalled(w.id),
        detect: () => isInstalled(w.id),
      }))
      .sort((a, b) => Number(b.installed) - Number(a.installed));
  }

  async connect(walletId, options = {}) {
    const { chain = "ethereum" } = options;
    this.state = WALLET_STATE.CONNECTING;
    const wallet = SUPPORTED_WALLETS[walletId];
    if (!wallet) throw new Error(`Unsupported wallet ${walletId}`);
    if (!isInstalled(walletId) && walletId !== "walletconnect") {
      throw new Error(`${wallet.name} is not installed`);
    }

    if (walletId === "walletconnect") {
      const projectId = import.meta.env.VITE_WC_PROJECT_ID;
      if (!projectId) throw new Error("Missing VITE_WC_PROJECT_ID");
      this.walletConnectProvider = await EthereumProvider.init({
        projectId,
        chains: [CHAIN_CONFIG.ethereum.id],
        optionalChains: Object.values(CHAIN_CONFIG).filter((c) => c.type === "evm").map((c) => c.id),
        showQrModal: true,
      });
      await this.walletConnectProvider.enable();
      this.provider = new BrowserProvider(this.walletConnectProvider);
      this.signer = await this.provider.getSigner();
      this.address = await this.signer.getAddress();
    } else if (walletId === "ledger") {
      const transport = ("hid" in navigator) ? await TransportWebHID.create() : await TransportWebUSB.create();
      this.ledgerEth = new AppEth(transport);
      const path = "44'/60'/0'/0/0";
      const res = await this.ledgerEth.getAddress(path, false, true);
      this.address = res.address;
    } else if (wallet.type === "sui") {
      const sui = window.suiWallet || window.sui;
      const acc = await sui.request({ method: "sui_requestAccounts" });
      this.provider = sui;
      this.address = acc?.[0];
    } else if (chain === "solana") {
      const sol = walletId === "backpack"
        ? window.backpack?.solana || window.solana
        : window.solana || window.phantom?.solana;
      if (!sol?.connect) throw new Error("Solana wallet provider not found");
      const res = await sol.connect();
      this.provider = sol;
      this.address = res.publicKey?.toString() || sol.publicKey?.toString();
    } else {
      const injected = pickInjectedProvider(walletId);
      await injected.request({ method: "eth_requestAccounts" });
      this.provider = new BrowserProvider(injected);
      this.signer = await this.provider.getSigner();
      this.address = await this.signer.getAddress();
      this._bindInjectedEvents(injected);
    }

    this.connectedWallet = wallet;
    this.connectedChain = CHAIN_CONFIG[chain] || CHAIN_CONFIG.ethereum;
    this.state = WALLET_STATE.CONNECTED;
    this.emitter.emit("connect", { wallet: this.connectedWallet, chain: this.connectedChain, address: this.address });
    return { success: true, wallet: this.connectedWallet, chain: this.connectedChain, address: this.address };
  }

  _bindInjectedEvents(provider) {
    provider?.on?.("accountsChanged", (accounts) => this.emitter.emit("accountsChanged", accounts));
    provider?.on?.("chainChanged", (chainId) => this.emitter.emit("chainChanged", chainId));
  }

  async disconnect() {
    if (this.walletConnectProvider?.disconnect) await this.walletConnectProvider.disconnect();
    if (this.provider?.disconnect) await this.provider.disconnect();
    this.state = WALLET_STATE.DISCONNECTED;
    this.connectedWallet = null;
    this.connectedChain = null;
    this.address = null;
    this.provider = null;
    this.signer = null;
    return { success: true };
  }

  async signMessage(message) {
    if (!this.address) throw new Error("Wallet not connected");
    if (this.connectedWallet?.id === "ledger") {
      const path = "44'/60'/0'/0/0";
      const hex = Buffer.from(message, "utf8").toString("hex");
      const sig = await this.ledgerEth.signPersonalMessage(path, hex);
      return `0x${sig.r}${sig.s}${sig.v.toString(16)}`;
    }
    if (this.connectedChain?.type === "solana") {
      if (!this.provider?.signMessage) {
        throw new Error("Solana wallet is not connected");
      }
      const signed = await this.provider.signMessage(new TextEncoder().encode(message), "utf8");
      return bs58.encode(signed.signature || signed);
    }
    if (this.connectedChain?.type === "sui") {
      const out = await this.provider.request({
        method: "sui_signPersonalMessage",
        params: { message: btoa(message), account: this.address },
      });
      return out.signature || out;
    }
    if (!this.signer?.signMessage) {
      throw new Error("EVM wallet is not connected");
    }
    return this.signer.signMessage(message);
  }

  async signTx(tx) {
    if (this.connectedChain?.type === "evm" && this.signer) return this.signer.signTransaction(tx);
    if (this.connectedChain?.type === "solana") {
      const txn = tx instanceof Transaction ? tx : Transaction.from(tx);
      const signed = await this.provider.signTransaction(txn);
      return bs58.encode(signed.serialize());
    }
    throw new Error("signTx not supported for selected wallet/chain");
  }

  async switchChain(chainKey) {
    const chain = CHAIN_CONFIG[chainKey];
    if (!chain) throw new Error("Unsupported chain");
    if (chain.type !== "evm") {
      this.connectedChain = chain;
      return { success: true, chain };
    }

    const hex = `0x${chain.id.toString(16)}`;
    const reqProvider = this.walletConnectProvider || this.provider?.provider || pickInjectedProvider(this.connectedWallet?.id);
    try {
      await reqProvider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e) {
      if (e?.code === 4902) {
        await reqProvider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hex,
            chainName: chain.name,
            nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: chain.decimals },
            rpcUrls: [chain.rpc],
            blockExplorerUrls: [chain.explorer],
          }],
        });
      } else {
        throw e;
      }
    }
    this.connectedChain = chain;
    return { success: true, chain };
  }

  async getBalance(address = this.address, chain = this.connectedChain?.id) {
    if (!address || !chain) return null;
    const cfg = CHAIN_CONFIG[chain] || CHAIN_CONFIG.ethereum;
    if (cfg.type === "evm") {
      const provider = this.provider || new BrowserProvider(pickInjectedProvider(this.connectedWallet?.id));
      const wei = await provider.getBalance(address);
      return { raw: wei.toString(), formatted: Number(formatEther(wei)).toFixed(4), symbol: cfg.symbol };
    }
    if (cfg.type === "solana") {
      const conn = new Connection(cfg.rpc, "confirmed");
      const lamports = await conn.getBalance(new PublicKey(address));
      return { raw: String(lamports), formatted: (lamports / 1e9).toFixed(4), symbol: "SOL" };
    }
    return null;
  }

  isConnected() {
    return this.state === WALLET_STATE.CONNECTED && Boolean(this.address);
  }

  getState() {
    return {
      state: this.state,
      wallet: this.connectedWallet,
      chain: this.connectedChain,
      address: this.address,
      isConnected: this.isConnected(),
    };
  }
}

const attachWalletMethods = (walletId, sdk) => ({
  ...SUPPORTED_WALLETS[walletId],
  detect: () => isInstalled(walletId),
  connect: (opts) => sdk.connect(walletId, opts),
  disconnect: () => sdk.disconnect(),
  signMessage: (m) => sdk.signMessage(m),
  signTx: (tx) => sdk.signTx(tx),
  switchChain: (c) => sdk.switchChain(c),
  on: (evt, cb) => sdk.on(evt, cb),
});

export const walletSDK = new ChainForgeWalletSDK();
Object.keys(SUPPORTED_WALLETS).forEach((id) => {
  SUPPORTED_WALLETS[id] = attachWalletMethods(id, walletSDK);
});

export { WALLET_STATE, SUPPORTED_WALLETS, CHAIN_CONFIG };
export default walletSDK;
