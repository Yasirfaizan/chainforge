/**
 * Real multi-chain on-chain data service.
 */
import { ethers } from "ethers";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { CHAIN_REGISTRY } from "../config/chains.js";
import { cacheGet, cacheSet } from "./cacheService.js";
import { withEvmProvider } from "./rpcProviderManager.js";

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

const chainPriceIds = {
  ethereum: "ethereum",
  polygon: "matic-network",
  bnb: "binancecoin",
  avalanche: "avalanche-2",
  arbitrum: "ethereum",
  optimism: "ethereum",
  base: "ethereum",
  zksync: "ethereum",
  linea: "ethereum",
  solana: "solana",
  sui: "sui",
  bitcoin: "bitcoin",
  cosmos: "cosmos",
  near: "near",
  aptos: "aptos",
};

const cosmosRestUrl =
  process.env.RPC_COSMOS || "https://cosmos-rest.publicnode.com";
const nearRpcUrl = process.env.RPC_NEAR || "https://rpc.mainnet.near.org";
const aptosRestUrl =
  process.env.RPC_APTOS || "https://fullnode.mainnet.aptoslabs.com/v1";
const tonApiUrl = process.env.RPC_TON || "https://tonapi.io/v2";
const tronGridUrl = process.env.RPC_TRON || "https://api.trongrid.io/v1";
const starknetVoyagerUrl =
  process.env.RPC_STARKNET || "https://api.voyager.online/beta";

function toSeconds(value) {
  if (!value) return Math.floor(Date.now() / 1000);
  const ms = Number(value);
  if (!Number.isFinite(ms)) return Math.floor(Date.now() / 1000);
  return ms > 1e12 ? Math.floor(ms / 1000) : Math.floor(ms);
}

function formatUnitsString(raw, decimals) {
  const input = String(raw || "0");
  const negative = input.startsWith("-");
  const digits = negative ? input.slice(1) : input;
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${fraction ? `${whole}.${fraction}` : whole}`;
}

function parseNearAmount(raw) {
  return formatUnitsString(raw, 24);
}

function parseCosmosAmount(raw) {
  return formatUnitsString(raw, 6);
}

function parseAptosAmount(raw) {
  return formatUnitsString(raw, 8);
}

function safeFirst(value) {
  return Array.isArray(value) && value.length ? value[0] : null;
}

async function getCosmosBalance(address) {
  const data = await fetchJson(
    `${cosmosRestUrl}/cosmos/bank/v1beta1/balances/${address}`,
  );
  const balances = Array.isArray(data?.balances) ? data.balances : [];
  const primary = balances.find((balance) => Number(balance.amount || 0) > 0) ||
    safeFirst(balances) || { amount: "0", denom: "uatom" };
  return {
    chain: "cosmos",
    symbol: CHAIN_REGISTRY.cosmos?.symbol || "ATOM",
    balance: parseCosmosAmount(primary.amount),
    nonce: null,
    blockNumber: null,
    chainSpecific: { balances },
  };
}

async function getCosmosHistory(address, { limit = 20, offset = 0 }) {
  const events = encodeURIComponent(`transfer.recipient='${address}'`);
  const data = await fetchJson(
    `${cosmosRestUrl}/cosmos/tx/v1beta1/txs?events=${events}&pagination.limit=${limit}&pagination.offset=${offset}`,
  );
  const txs = Array.isArray(data?.tx_responses) ? data.tx_responses : [];
  return txs.map((tx) => ({
    hash: tx.txhash || "",
    from:
      tx.events
        ?.flatMap((event) => event.attributes || [])
        .find((attr) => attr.key === "sender")?.value || address,
    to: address,
    value: "0",
    timestamp: toSeconds(tx.timestamp),
    chainSpecific: tx,
  }));
}

async function getNearBalance(accountId) {
  const data = await fetchJson(nearRpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "near-balance",
      method: "query",
      params: {
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      },
    }),
  });
  const result = data?.result || {};
  return {
    chain: "near",
    symbol: CHAIN_REGISTRY.near?.symbol || "NEAR",
    balance: parseNearAmount(result.amount || "0"),
    nonce: result.locked || null,
    blockNumber: null,
    chainSpecific: result,
  };
}

async function getNearHistory(accountId, { limit = 20, offset = 0 }) {
  const base = process.env.NEAR_EXPLORER_API || "https://api.nearblocks.io/v1";
  try {
    const data = await fetchJson(
      `${base}/account/${accountId}/txns?limit=${limit}&offset=${offset}`,
    );
    const txs = Array.isArray(data?.txns)
      ? data.txns
      : Array.isArray(data?.data?.txns)
        ? data.data.txns
        : [];
    return txs.map((tx) => ({
      hash: tx.transaction_hash || tx.hash || "",
      from: tx.signer_id || accountId,
      to: tx.receiver_id || accountId,
      value: "0",
      timestamp: toSeconds(tx.block_timestamp || tx.created_at || tx.timestamp),
      chainSpecific: tx,
    }));
  } catch {
    return [];
  }
}

async function getAptosBalance(address) {
  const resources = await fetchJson(
    `${aptosRestUrl}/accounts/${address}/resources`,
  );
  const coinResource = Array.isArray(resources)
    ? resources.find((resource) =>
        String(resource.type || "").includes(
          "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
        ),
      )
    : null;
  const coinInfo = coinResource?.data || {};
  const balance =
    coinInfo.coin?.value || coinInfo.coin?.amount || coinInfo.balance || "0";
  return {
    chain: "aptos",
    symbol: CHAIN_REGISTRY.aptos?.symbol || "APT",
    balance: parseAptosAmount(balance),
    nonce: coinInfo.sequence_number || null,
    blockNumber: null,
    chainSpecific: { resource: coinResource || null },
  };
}

async function getAptosHistory(address, { limit = 20, offset = 0 }) {
  const data = await fetchJson(
    `${aptosRestUrl}/accounts/${address}/transactions?limit=${limit}&start=${offset}`,
  );
  const txs = Array.isArray(data) ? data : [];
  return txs.map((tx) => ({
    hash: tx.hash || tx.version || "",
    from: tx.sender || address,
    to: address,
    value: "0",
    timestamp: toSeconds(tx.timestamp || tx.block_timestamp),
    chainSpecific: tx,
  }));
}

async function getTonBalance(address) {
  const data = await fetchJson(`${tonApiUrl}/accounts/${address}`);
  return {
    chain: "ton",
    symbol: CHAIN_REGISTRY.ton?.symbol || "TON",
    balance: formatUnitsString(data?.balance || 0, 9),
    nonce: null,
    blockNumber: null,
    chainSpecific: data,
  };
}

async function getTonHistory(address, { limit = 20, offset = 0 }) {
  const data = await fetchJson(
    `${tonApiUrl}/blockchain/accounts/${address}/transactions?limit=${limit}&after_lt=${offset || undefined}`,
  );
  const txs = Array.isArray(data?.transactions) ? data.transactions : [];
  return txs.map((tx) => ({
    hash: tx.hash || "",
    from: tx.account?.address || address,
    to: address,
    value: "0",
    timestamp: toSeconds(tx.utime),
    chainSpecific: tx,
  }));
}

function tronApiKeyHeader() {
  return process.env.TRONGRID_API_KEY
    ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
    : {};
}

async function getTronBalance(address) {
  const data = await fetchJson(`${tronGridUrl}/accounts/${address}`, {
    headers: tronApiKeyHeader(),
  });
  const account = safeFirst(data?.data) || {};
  return {
    chain: "tron",
    symbol: CHAIN_REGISTRY.tron?.symbol || "TRX",
    balance: formatUnitsString(account.balance || 0, 6),
    nonce: null,
    blockNumber: null,
    chainSpecific: account,
  };
}

async function getTronHistory(address, { limit = 20, offset = 0 }) {
  const data = await fetchJson(
    `${tronGridUrl}/accounts/${address}/transactions?only_confirmed=true&limit=${limit}&fingerprint=${offset || undefined}`,
    { headers: tronApiKeyHeader() },
  );
  const txs = Array.isArray(data?.data) ? data.data : [];
  return txs.map((tx) => ({
    hash: tx.txID || tx.transaction_id || "",
    from: tx.ownerAddress || address,
    to: tx.toAddress || address,
    value: "0",
    timestamp: toSeconds(tx.block_timestamp),
    chainSpecific: tx,
  }));
}

function starknetApiKeyHeader() {
  return process.env.VOYAGER_API_KEY
    ? { "x-api-key": process.env.VOYAGER_API_KEY }
    : {};
}

async function getStarknetBalance(address) {
  const data = await fetchJson(
    `${starknetVoyagerUrl}/contracts/${address}/token-balances`,
    { headers: starknetApiKeyHeader() },
  );
  const balances = Array.isArray(data?.erc20TokenBalances)
    ? data.erc20TokenBalances
    : [];
  const primary = safeFirst(balances) || {};
  return {
    chain: "starknet",
    symbol: CHAIN_REGISTRY.starknet?.symbol || "ETH",
    balance: String(primary.formattedBalance || primary.balance || 0),
    nonce: null,
    blockNumber: null,
    chainSpecific: { balances, raw: data },
  };
}

async function getStarknetHistory(address, { limit = 20, offset = 0 }) {
  const page = Math.max(1, Math.floor(offset / Math.max(1, limit)) + 1);
  const data = await fetchJson(
    `${starknetVoyagerUrl}/txns?to=${address}&p=${page}&ps=${limit}`,
    { headers: starknetApiKeyHeader() },
  );
  const txs = Array.isArray(data?.items) ? data.items : [];
  return txs.map((tx) => ({
    hash: tx.hash || "",
    from: tx.sender_address || address,
    to: address,
    value: "0",
    timestamp: toSeconds(tx.timestamp),
    chainSpecific: tx,
  }));
}

function shortAddr(a = "") {
  if (!a) return "";
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function relativeTime(tsMs) {
  const s = Math.max(1, Math.floor((Date.now() - tsMs) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function fetchJson(url, options = undefined) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`Request failed ${r.status}`);
  return r.json();
}

async function getUsdPrice(chain) {
  const priceId = chainPriceIds[chain];
  if (!priceId) return 0;
  const key = `price:${priceId}`;
  const cached = await cacheGet(key);
  if (cached) return cached;
  const apiKey = process.env.COINGECKO_API_KEY;
  const base = apiKey
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";
  const data = await fetchJson(
    `${base}/simple/price?ids=${encodeURIComponent(priceId)}&vs_currencies=usd${apiKey ? `&x_cg_pro_api_key=${apiKey}` : ""}`,
  );
  const usd = Number(data?.[priceId]?.usd || 0);
  await cacheSet(key, usd, 60);
  return usd;
}

function normalizeEvmTx(tx) {
  return {
    hash: tx.hash || tx.transactionHash,
    from: tx.from || "",
    to: tx.to || "",
    value: tx.value || "0",
    timestamp: Number(
      tx.timeStamp || tx.timestamp || Math.floor(Date.now() / 1000),
    ),
    chainSpecific: tx,
  };
}

async function getEvmHistory(address, chain, { limit = 20, offset = 0 }) {
  const chainCfg = CHAIN_REGISTRY[chain];
  const page = Math.floor(offset / Math.max(1, limit)) + 1;
  if (process.env.ETHERSCAN_API_KEY) {
    const url = `${ETHERSCAN_V2_BASE}?chainid=${chainCfg.chainId}&module=account&action=txlist&address=${address}&page=${page}&offset=${limit}&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`;
    const data = await fetchJson(url);
    const txs = Array.isArray(data?.result) ? data.result : [];
    return txs.map(normalizeEvmTx);
  }

  // Fallback to provider log scan when Etherscan key is not present.
  return withEvmProvider(chain, async (provider) => {
    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - 6000);
    const sentLogs = await provider.getLogs({
      fromBlock,
      toBlock: latest,
      topics: [null, ethers.zeroPadValue(address, 32)],
    });
    const rxLogs = await provider.getLogs({
      fromBlock,
      toBlock: latest,
      topics: [null, null, ethers.zeroPadValue(address, 32)],
    });
    const uniq = [...sentLogs, ...rxLogs].slice(0, limit).map((l) => ({
      hash: l.transactionHash,
      from: "",
      to: "",
      value: "0",
      timestamp: Math.floor(Date.now() / 1000),
    }));
    return uniq;
  });
}

async function getSolanaConnection() {
  const endpoint = process.env.RPC_SOLANA || clusterApiUrl("devnet");
  return new Connection(endpoint, "confirmed");
}

const suiRpcUrl = process.env.RPC_SUI || "https://fullnode.mainnet.sui.io:443";

export async function getBalance(address, chain) {
  const key = `balance:${chain}:${address.toLowerCase()}`;
  const cached = await cacheGet(key);
  if (cached) return cached;

  let result;
  if (CHAIN_REGISTRY[chain]?.type === "evm") {
    result = await withEvmProvider(chain, async (provider) => {
      const [balance, nonce, blockNumber] = await Promise.all([
        provider.getBalance(address),
        provider.getTransactionCount(address),
        provider.getBlockNumber(),
      ]);
      return {
        chain,
        symbol: CHAIN_REGISTRY[chain].symbol,
        balance: ethers.formatEther(balance),
        nonce,
        blockNumber,
      };
    });
  } else if (chain === "solana") {
    const conn = await getSolanaConnection();
    const pk = new PublicKey(address);
    const [lamports, slot] = await Promise.all([
      conn.getBalance(pk),
      conn.getSlot(),
    ]);
    result = {
      chain,
      symbol: "SOL",
      balance: String(lamports / LAMPORTS_PER_SOL),
      nonce: null,
      blockNumber: slot,
    };
  } else if (chain === "sui") {
    const balancesResp = await fetchJson(suiRpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "suix_getAllBalances",
        params: [address],
      }),
    });
    const balances = balancesResp?.result || [];
    const main =
      balances.find((b) => String(b.coinType || "").includes("::sui::SUI")) ||
      balances[0];
    result = {
      chain,
      symbol: "SUI",
      balance: String(Number(main?.totalBalance || 0) / 1e9),
      nonce: null,
      blockNumber: null,
    };
  } else if (chain === "bitcoin") {
    const data = await fetchJson(
      `${process.env.BITCOIN_API_BASE || "https://mempool.space/api"}/address/${address}`,
    );
    result = {
      chain,
      symbol: "BTC",
      balance: String(
        (Number(data?.chain_stats?.funded_txo_sum || 0) -
          Number(data?.chain_stats?.spent_txo_sum || 0)) /
          1e8,
      ),
      nonce: null,
      blockNumber: null,
    };
  } else if (chain === "cosmos") {
    result = await getCosmosBalance(address);
  } else if (chain === "near") {
    result = await getNearBalance(address);
  } else if (chain === "aptos") {
    result = await getAptosBalance(address);
  } else if (chain === "ton") {
    result = await getTonBalance(address);
  } else if (chain === "tron") {
    result = await getTronBalance(address);
  } else if (chain === "starknet") {
    result = await getStarknetBalance(address);
  } else {
    throw new Error(`Unsupported chain ${chain}`);
  }

  await cacheSet(key, result, 30);
  return result;
}

export async function getHistory(
  address,
  chain,
  { limit = 20, offset = 0 } = {},
) {
  const key = `history:${chain}:${address.toLowerCase()}:${limit}:${offset}`;
  const cached = await cacheGet(key);
  if (cached) return cached;

  let txs = [];
  if (CHAIN_REGISTRY[chain]?.type === "evm") {
    txs = await getEvmHistory(address, chain, { limit, offset });
  } else if (chain === "solana") {
    const conn = await getSolanaConnection();
    const sigs = await conn.getSignaturesForAddress(new PublicKey(address), {
      limit,
    });
    txs = await Promise.all(
      sigs.map(async (s) => {
        const parsed = await conn.getParsedTransaction(s.signature, {
          maxSupportedTransactionVersion: 0,
        });
        return {
          hash: s.signature,
          from: "",
          to: "",
          value: "0",
          timestamp: s.blockTime || Math.floor(Date.now() / 1000),
          chainSpecific: parsed,
        };
      }),
    );
  } else if (chain === "sui") {
    const resp = await fetchJson(suiRpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "suix_queryTransactionBlocks",
        params: [{ filter: { FromAddress: address } }, null, limit, true],
      }),
    });
    txs = (resp?.result?.data || []).map((t) => ({
      hash: t.digest || "",
      from: t.transaction?.data?.sender || t.sender || "",
      to: "",
      value: "0",
      timestamp: Math.floor((Number(t.timestampMs) || Date.now()) / 1000),
      chainSpecific: t,
    }));
  } else if (chain === "bitcoin") {
    const base = process.env.BITCOIN_API_BASE || "https://mempool.space/api";
    const data = await fetchJson(`${base}/address/${address}/txs`);
    txs = (Array.isArray(data) ? data : [])
      .slice(offset, offset + limit)
      .map((t) => ({
        hash: t.txid,
        from: "",
        to: "",
        value: "0",
        timestamp: t.status?.block_time || Math.floor(Date.now() / 1000),
        chainSpecific: t,
      }));
  } else if (chain === "cosmos") {
    txs = await getCosmosHistory(address, { limit, offset });
  } else if (chain === "near") {
    txs = await getNearHistory(address, { limit, offset });
  } else if (chain === "aptos") {
    txs = await getAptosHistory(address, { limit, offset });
  } else if (chain === "ton") {
    txs = await getTonHistory(address, { limit, offset });
  } else if (chain === "tron") {
    if (!process.env.TRONGRID_API_KEY) {
      throw new Error("TRONGRID_API_KEY is required for Tron history support");
    }
    txs = await getTronHistory(address, { limit, offset });
  } else if (chain === "starknet") {
    if (!process.env.VOYAGER_API_KEY) {
      throw new Error(
        "VOYAGER_API_KEY is required for StarkNet history support",
      );
    }
    txs = await getStarknetHistory(address, { limit, offset });
  } else {
    throw new Error(`Unsupported chain ${chain}`);
  }

  const result = {
    address,
    chain,
    rows: txs.map((tx) => humanize(tx, chain)),
    total: txs.length,
    limit,
    offset,
  };
  await cacheSet(key, result, 60);
  return result;
}

export async function getGasPrice(chain) {
  const key = `gas:${chain}`;
  const cached = await cacheGet(key);
  if (cached) return cached;
  let result;
  if (CHAIN_REGISTRY[chain]?.type === "evm") {
    result = await withEvmProvider(chain, async (provider) => {
      // ethers v6 may use chain-specific fee plugins (e.g. Polygon gas station).
      // If those fail (common with unauthenticated RPC endpoints), fall back to
      // plain JSON-RPC methods so the API remains usable.
      try {
        const fee = await provider.getFeeData();
        return {
          chain,
          gasPrice: fee.gasPrice?.toString() || "0",
          maxFeePerGas: fee.maxFeePerGas?.toString() || null,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas?.toString() || null,
        };
      } catch {
        const [gasPriceHex, priorityHex, latestBlock] = await Promise.all([
          provider.send("eth_gasPrice", []),
          provider.send("eth_maxPriorityFeePerGas", []).catch(() => null),
          provider.getBlock("latest").catch(() => null),
        ]);

        const gasPrice = gasPriceHex ? BigInt(gasPriceHex) : 0n;
        const maxPriorityFeePerGas = priorityHex ? BigInt(priorityHex) : null;
        const baseFeePerGas =
          latestBlock?.baseFeePerGas != null
            ? BigInt(latestBlock.baseFeePerGas)
            : null;

        // Simple EIP-1559 suggestion: maxFee = 2*baseFee + priority
        const maxFeePerGas =
          baseFeePerGas != null && maxPriorityFeePerGas != null
            ? baseFeePerGas * 2n + maxPriorityFeePerGas
            : null;

        return {
          chain,
          gasPrice: gasPrice.toString(),
          maxFeePerGas: maxFeePerGas?.toString() || null,
          maxPriorityFeePerGas: maxPriorityFeePerGas?.toString() || null,
        };
      }
    });
  } else if (chain === "solana") {
    result = { chain, gasPrice: "5000" };
  } else if (chain === "sui") {
    result = { chain, gasPrice: "1000" };
  } else if (chain === "bitcoin") {
    const fees = await fetchJson(
      `${process.env.BITCOIN_API_BASE || "https://mempool.space/api"}/v1/fees/recommended`,
    );
    result = { chain, gasPrice: String(fees?.fastestFee || 0) };
  } else {
    // For chains we don't compute gas prices for yet, return null to avoid
    // throwing errors that break user flows (e.g., wallet signup).
    result = { chain, gasPrice: null };
  }
  await cacheSet(key, result, 10);
  return result;
}

export function humanize(tx, chain) {
  const chainCfg = CHAIN_REGISTRY[chain];
  const symbol = chainCfg?.symbol || "";
  const tsMs = Number(tx.timestamp || Math.floor(Date.now() / 1000)) * 1000;
  const amount =
    Number(tx.value || 0) / (CHAIN_REGISTRY[chain]?.type === "evm" ? 1e18 : 1);
  const from = shortAddr(tx.from);
  const to = shortAddr(tx.to);
  const timeAgo = relativeTime(tsMs);
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    amount: Number.isFinite(amount) ? amount : 0,
    symbol,
    timestamp: new Date(tsMs).toISOString(),
    summary: `Sent ${(Number.isFinite(amount) ? amount : 0).toFixed(4)} ${symbol} to ${to || from || "unknown"} · ${timeAgo}`,
  };
}

export async function humanizeWithUsd(tx, chain) {
  const base = humanize(tx, chain);
  const usd = await getUsdPrice(chain);
  const totalUsd = base.amount * usd;
  return {
    ...base,
    summary: `${base.summary} · $${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
  };
}

export default {
  getBalance,
  getHistory,
  getGasPrice,
  humanize,
};
