# ChainForge Public API Fallbacks

This document describes the public (free-tier) API endpoints available for chains that typically require API keys, plus strategies for rate-limit handling and fallback chains.

## Overview

ChainForge supports on-chain data queries for 15 blockchains. Most chains have free public RPC endpoints or rate-limited free APIs. A few chains have API key-gated premium endpoints, but free public alternatives exist.

## Chains with Free Public Endpoints

| Chain         | Default Endpoint                      | Type     | Rate Limit | Notes                            |
| ------------- | ------------------------------------- | -------- | ---------- | -------------------------------- |
| **Ethereum**  | `https://eth.public.jsonrpc.io`       | JSON-RPC | Low        | Public JSON-RPC endpoint    |
| **Polygon**   | `https://polygon.public.jsonrpc.io`   | JSON-RPC | Low        | Public JSON-RPC endpoint    |
| **BNB Chain** | `https://bsc.publicnode.com`          | JSON-RPC | Medium     | PublicNode provider              |
| **Avalanche** | `https://avalanche.public.jsonrpc.io` | JSON-RPC | Low        | Ava Labs public endpoint         |
| **Arbitrum**  | `https://arb.publicnode.com`          | JSON-RPC | Medium     | PublicNode provider              |
| **Optimism**  | `https://opt.publicnode.com`          | JSON-RPC | Medium     | PublicNode provider              |
| **Base**      | `https://base.publicnode.com`         | JSON-RPC | Medium     | PublicNode provider              |
| **zkSync**    | `https://zksync.public.blastapi.io`   | JSON-RPC | Medium     | Blast API public tier            |
| **Linea**     | `https://linea.public.blastapi.io`    | JSON-RPC | Medium     | Blast API public tier            |
| **Solana**    | `https://api.mainnet-beta.solana.com` | JSON-RPC | High       | Solana Foundation endpoint       |
| **Sui**       | `https://fullnode.mainnet.sui.io`     | JSON-RPC | Medium     | Mysten Labs endpoint             |
| **Bitcoin**   | `https://mempool.space/api`           | REST     | High       | Mempool Space (no keys required) |
| **Cosmos**    | `https://cosmos-rest.publicnode.com`  | REST     | Medium     | PublicNode REST endpoint         |
| **NEAR**      | `https://rpc.mainnet.near.org`        | JSON-RPC | Medium     | NEAR Foundation endpoint         |

## Chains with Optional API Key Optimization

### Tron

**Free Endpoint**: `https://api.tronstack.io/` (Community-run, no auth required)

**Paid Endpoint**: `https://api.trongrid.io/` (TronGrid official, requires `TRONGRID_API_KEY`)

**Rate Limits**:

- Free: ~5 requests/sec
- Paid: Up to 10,000 requests/day depending on tier

**Setup**:

```bash
# Optional: Add API key for higher rate limits
export TRONGRID_API_KEY=your_key_here
```

**Fallback Strategy**:

- If `TRONGRID_API_KEY` is set, use TronGrid
- Otherwise, use free Tron Stack endpoint
- If both fail, return graceful error with rate-limit message

---

### StarkNet

**Free Endpoint**: `https://starknet.publicnode.com` (PublicNode, no auth required)

**Paid Endpoint**: `https://stark-rpc.starkware.co/` via Voyager (requires `VOYAGER_API_KEY`)

**Rate Limits**:

- Free: ~50 requests/min
- Paid: Higher with tier

**Setup**:

```bash
# Optional: Add API key for higher rate limits
export VOYAGER_API_KEY=your_key_here
```

**Fallback Strategy**:

- If `VOYAGER_API_KEY` is set, use Voyager API
- Otherwise, use PublicNode free endpoint
- If both fail, return graceful error with rate-limit message

---

### TON

**Free Endpoint**: `https://tonapi.io/v2` (TON API, free tier)

**Rate Limits**:

- Free tier: 100 requests/minute (per IP)

**Rate Limiting Best Practices**:

- Implement request queuing with exponential backoff
- Cache responses aggressively (balance lookups: 5min, transactions: 1min)
- Batch requests where possible

---

## Recommended Configuration

### Production (.env)

```bash
# Optional API keys for premium endpoints
TRONGRID_API_KEY=                     # Leave blank to use free endpoint
VOYAGER_API_KEY=                      # Leave blank to use free endpoint

# Cache settings for public APIs
CACHE_TTL_BALANCE=300                 # 5 minutes for balance queries
CACHE_TTL_HISTORY=60                  # 1 minute for transaction history
CACHE_TTL_GAS=30                      # 30 seconds for gas prices
```

### Development (.env.development)

```bash
# For development, use free endpoints (API keys optional)
TRONGRID_API_KEY=
VOYAGER_API_KEY=

# Shorter cache for development
CACHE_TTL_BALANCE=60
CACHE_TTL_HISTORY=10
CACHE_TTL_GAS=5
```

---

## Rate Limiting Strategy

### Per-Chain Rate Limits

ChainForge implements distributed rate limiting:

1. **Redis-backed counters** (production):
   - Tracks requests per chain, per IP, per API key
   - Exponential backoff on rate limit

2. **In-memory fallback** (development):
   - LocalMemory cache when Redis unavailable
   - Same limits applied

### Recommended Limits per Chain

| Chain           | Req/sec | Req/min | Notes                             |
| --------------- | ------- | ------- | --------------------------------- |
| Ethereum        | 10      | 600     | Well-provisioned public endpoint  |
| Solana          | 20      | 1200    | High capacity                     |
| Bitcoin/Mempool | 50      | 3000    | Mempool Space scales well         |
| Tron (free)     | 5       | 300     | Community endpoint, be respectful |
| StarkNet (free) | 1       | 50      | PublicNode is limited             |
| TON             | 1       | 100     | Free tier limit                   |

---

## Error Handling

### Graceful Fallback Pattern

```javascript
// onchainDataService.js pattern
async function getBalance(address, chain) {
  try {
    // Try primary endpoint
    return await queryPrimaryEndpoint(address, chain);
  } catch (error) {
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      // Implement exponential backoff
      await sleep(calculateBackoff(retryCount));
      return await queryPrimaryEndpoint(address, chain);
    }
    if (error.code === "ENDPOINT_UNAVAILABLE") {
      // Try secondary endpoint if available
      return await querySecondaryEndpoint(address, chain);
    }
    throw error; // Re-throw if not recoverable
  }
}
```

### User-Facing Error Messages

```json
{
  "error": "Rate limit exceeded for Tron",
  "message": "Please try again in 30 seconds, or consider providing TRONGRID_API_KEY for higher limits",
  "chainId": "tron",
  "retryAfter": 30
}
```

---

## Migration Path: Free to Paid APIs

### When to Add API Keys

1. **Production deployment** with anticipated > 100 daily active users
2. **Rate limit errors** appearing in logs
3. **Critical chains** requiring guaranteed availability

### How to Add API Keys

1. **Get keys**:
   - TronGrid: https://www.trongrid.io (free tier available)
   - Voyager: Via StarkWare partner program
   - Other chains: Most free endpoints don't require keys

2. **Update `.env`**:

   ```bash
   TRONGRID_API_KEY=YOUR_TRONGRID_KEY
   VOYAGER_API_KEY=YOUR_VOYAGER_KEY
   ```

3. **Restart server**:

   ```bash
   npm run dev  # or npm start
   ```

4. **Monitor**: Check logs for "Using premium endpoint" messages

---

## Testing Rate Limits Locally

```bash
# Simulate rate limit stress test (requires Node.js)
node scripts/rate-limit-test.js --chain tron --requests 1000 --interval 100ms

# Expected output:
# Sent 1000 requests
# Rate limited: 45 times
# Average backoff: 250ms
```

---

## Monitoring & Alerts

### Metrics to Track

- Requests per chain
- Rate limit errors (4xx/5xx)
- Average response time
- Endpoint availability (health checks)

### Alert Thresholds

- 🟡 Yellow: Chain endpoint has 50+ rate limit errors/hour
- 🔴 Red: Chain endpoint down for >5 minutes

---

## References

- **PublicNode**: https://publicnode.com/ (Multi-chain public RPC)
- **Mempool Space**: https://mempool.space/api (Bitcoin)
- **TronGrid**: https://www.trongrid.io (Tron)
- **StarkWare**: https://starkware.co/ (StarkNet)
- **Solana RPC**: https://docs.solana.com/api/http
- **Chainlist**: https://chainlist.org/ (Find RPC endpoints)
