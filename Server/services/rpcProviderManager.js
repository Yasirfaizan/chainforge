/**
 * RPC provider manager with round-robin, failover, and tiny circuit breaker.
 */
import { ethers } from "ethers";
import { CHAIN_REGISTRY } from "../config/chains.js";

const state = new Map();

function now() {
  return Date.now();
}

function getState(chain) {
  if (!state.has(chain)) {
    state.set(chain, {
      idx: 0,
      failCount: 0,
      firstFailAt: 0,
      openUntil: 0,
    });
  }
  return state.get(chain);
}

function isRetryableStatus(err) {
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("50") ||
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("server_error") ||
    msg.includes("connection refused") ||
    code.includes("enotfound") ||
    code.includes("econnrefused") ||
    code.includes("server_error") ||
    code.includes("unknown_error")
  );
}

function availableRpcs(chain) {
  const cfg = CHAIN_REGISTRY[chain];
  if (!cfg) throw new Error(`Unsupported chain ${chain}`);
  const configured = cfg.rpc
    .map((envKey) => {
      const v = process.env[envKey];
      return typeof v === "string" ? v.trim() : v;
    })
    .filter((v) => typeof v === "string" && /^https?:\/\//i.test(v));
  if (configured.length) return configured;

  const alchemy = process.env.ALCHEMY_API_KEY;
  const ankr = process.env.ANKR_API_KEY;

  const alchemyByChain = alchemy
    ? {
        ethereum: `https://eth-mainnet.g.alchemy.com/v2/${alchemy}`,
        polygon: `https://polygon-mainnet.g.alchemy.com/v2/${alchemy}`,
        arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${alchemy}`,
        optimism: `https://opt-mainnet.g.alchemy.com/v2/${alchemy}`,
        base: `https://base-mainnet.g.alchemy.com/v2/${alchemy}`,
      }
    : {};

  const ankrByChain = ankr
    ? {
        ethereum: `https://rpc.ankr.com/eth/${ankr}`,
        polygon: `https://rpc.ankr.com/polygon/${ankr}`,
        bnb: `https://rpc.ankr.com/bsc/${ankr}`,
        avalanche: `https://rpc.ankr.com/avalanche/${ankr}`,
        arbitrum: `https://rpc.ankr.com/arbitrum/${ankr}`,
        optimism: `https://rpc.ankr.com/optimism/${ankr}`,
      }
    : {};

  const publicRpcByChain = {
    ethereum: "https://ethereum-rpc.publicnode.com",
    polygon: "https://polygon-bor-rpc.publicnode.com",
    bnb: "https://bsc-dataseed.binance.org",
    avalanche: "https://api.avax.network/ext/bc/C/rpc",
    arbitrum: "https://arb1.arbitrum.io/rpc",
    optimism: "https://mainnet.optimism.io",
    base: "https://mainnet.base.org",
    zksync: "https://mainnet.era.zksync.io",
    linea: "https://rpc.linea.build",
  };

  const all = [
    ...configured,
    alchemyByChain[chain],
    ankrByChain[chain],
    publicRpcByChain[chain],
  ].filter(Boolean);
  return [...new Set(all)];
}

export async function withEvmProvider(chain, fn) {
  const rpcs = availableRpcs(chain);
  if (rpcs.length === 0) throw new Error(`No RPC configured for ${chain}`);

  const s = getState(chain);
  if (s.openUntil > now()) throw new Error(`Circuit open for ${chain}`);

  const attempts = rpcs.length;
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    const idx = (s.idx + i) % attempts;
    const rpc = rpcs[idx];

    // Cache providers by URL to avoid ethers v6 background polling leaks
    if (!state.has(rpc)) {
      const chainId = CHAIN_REGISTRY[chain].chainId;
      state.set(
        rpc,
        new ethers.JsonRpcProvider(rpc, chainId, { staticNetwork: true }),
      );
    }
    const provider = state.get(rpc);

    try {
      const result = await fn(provider);
      s.idx = (idx + 1) % attempts;
      s.failCount = 0;
      s.firstFailAt = 0;
      return result;
    } catch (err) {
      lastErr = err;
      if (isRetryableStatus(err)) {
        if (!s.firstFailAt || now() - s.firstFailAt > 60_000) {
          s.firstFailAt = now();
          s.failCount = 0;
        }
        s.failCount += 1;
        if (s.failCount >= 3) {
          s.openUntil = now() + 5 * 60_000;
        }
      } else {
        throw err;
      }
    }
  }

  throw lastErr || new Error(`All RPCs failed for ${chain}`);
}
