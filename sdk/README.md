# ChainForge SDK

> **The Firebase of Web3** — Ship multi-chain dApps in minutes, not months.

ChainForge SDK eliminates the complexity of Web3 development. No blockchain knowledge required. Works just like Firebase, Auth0, or Stripe.

## 🚀 Why ChainForge?

| Problem | Traditional Web3 | ChainForge SDK |
|---------|-----------------|----------------|
| Wallet Integration | 100+ lines, multiple libraries | `cf.auth.connectWallet('metamask')` |
| User Management | Complex SIWE, nonces, signatures | Automatic, built-in |
| Reading Blockchain | Raw hex data, ABI decoding | Human-readable JSON |
| Transactions | Gas estimation, nonce management | `cf.transactions.send({to, amount})` |
| Multi-chain | Different APIs for each chain | One API, 7 chains |
| Auth State | Manual localStorage handling | Automatic persistence |

## 📦 Installation

```bash
npm install @chainforge/sdk
# or
yarn add @chainforge/sdk
# or
<script src="https://unpkg.com/@chainforge/sdk"></script>
```

## 🔑 Quick Start

### 1. Initialize SDK

```javascript
import { ChainForge } from '@chainforge/sdk';

const cf = new ChainForge({
  apiKey: 'your-api-key',  // Get from chainforge.io/dashboard
  baseURL: 'https://api.chainforge.io'  // Optional: for self-hosted
});
```

### 2. Connect Wallet (One Line)

```javascript
// As simple as Firebase Auth
const { user, token } = await cf.auth.connectWallet('metamask');

console.log(user.address);  // 0x742d35...
console.log(user.chain);    // ethereum
```

### 3. Read Blockchain Data (No Web3 Knowledge)

```javascript
// Get balance - returns human-readable format
const balance = await cf.data.getBalance();
console.log(balance.formatted);  // "1.5"
console.log(balance.symbol);     // "ETH"

// Get transaction history - auto-humanized
const history = await cf.data.getHistory({ limit: 10 });
history.forEach(tx => {
  console.log(tx.summary);  // "Sent 0.1 ETH to 0x1234..."
  console.log(tx.display.timeAgo);  // "2h ago"
});
```

### 4. Send Transactions (Abstracted Complexity)

```javascript
// No gas estimation, no nonce management, no hex encoding
const tx = await cf.transactions.send({
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8dEe',
  amount: '0.1 ETH'
});

console.log(tx.hash);      // 0xabc123...
console.log(tx.explorer);  // https://etherscan.io/tx/0xabc123...

// Wait for confirmation
await tx.wait();
console.log('Confirmed!');
```

## 📖 Full API Reference

### Authentication

#### `cf.auth.connectWallet(walletType, options)`

Connect a wallet and authenticate the user.

```javascript
// Connect MetaMask
const { user, token } = await cf.auth.connectWallet('metamask');

// Connect Phantom on Solana
const { user, token } = await cf.auth.connectWallet('phantom', { chain: 'solana' });

// Supported wallets: 'metamask', 'phantom', 'brave', 'coinbase', 'trust'
```

#### `cf.auth.loginWithEmail(email, password)`

Traditional email/password auth.

```javascript
const { user, token } = await cf.auth.loginWithEmail('user@example.com', 'password');
```

#### `cf.auth.signupWithEmail(email, password, name)`

Create account with email/password.

```javascript
const { user, token } = await cf.auth.signupWithEmail(
  'user@example.com', 
  'password',
  'John Doe'
);
```

#### `cf.auth.signOut()`

Sign out and clear session.

```javascript
await cf.auth.signOut();
```

#### `cf.auth.getCurrentUser()`

Get currently logged-in user.

```javascript
const user = cf.auth.getCurrentUser();
console.log(user.wallets);  // Array of linked wallets
```

### Data (Reading Blockchain)

#### `cf.data.getBalance(address?, chain?)`

Get wallet balance in human-readable format.

```javascript
// Get current user's balance
const balance = await cf.data.getBalance();
// { formatted: "1.5", symbol: "ETH", raw: "1500000000000000000" }

// Get any address balance
const balance = await cf.data.getBalance('0x1234...', 'polygon');
// { formatted: "100.5", symbol: "MATIC", raw: "100500000000000000000" }
```

#### `cf.data.getHistory(options)`

Get human-readable transaction history.

```javascript
const history = await cf.data.getHistory({
  address: '0x1234...',  // Optional: defaults to current user
  chain: 'ethereum',      // Optional: defaults to user's chain
  limit: 20              // Optional: default 20
});

history.forEach(tx => {
  console.log(tx.summary);           // "Sent 0.5 ETH to 0x5678..."
  console.log(tx.display.timeAgo);   // "2h ago"
  console.log(tx.display.statusConfig.label);  // "Confirmed"
  console.log(tx.display.explorerUrl);  // Link to explorer
  
  // Raw data also available
  console.log(tx.raw.hash);
  console.log(tx.raw.from);
  console.log(tx.raw.to);
});
```

#### `cf.data.getTransaction(hash, chain?)`

Get details for a specific transaction.

```javascript
const tx = await cf.data.getTransaction('0xabc123...');
console.log(tx.summary);  // Human-readable description
```

#### `cf.data.sync()`

Sync blockchain data to ChainForge (for caching/indexing).

```javascript
const result = await cf.data.sync();
console.log(`Synced ${result.synced} transactions`);
```

### Transactions

#### `cf.transactions.send({ to, amount, data?, options? })`

Send a transaction with automatic gas estimation.

```javascript
const tx = await cf.transactions.send({
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8dEe',
  amount: '0.1 ETH',  // Human-readable: "amount unit"
  data: '0x...',       // Optional: contract interaction data
  options: {
    gasLimit: '30000',  // Optional: auto-estimated if not provided
  }
});

console.log(tx.hash);      // Transaction hash
console.log(tx.explorer);  // Explorer URL
await tx.wait();           // Wait for confirmation
```

#### `cf.transactions.estimateGas(to, amount)`

Estimate gas for a transaction.

```javascript
const gas = await cf.transactions.estimateGas(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f8dEe',
  { value: '0.1', symbol: 'ETH' }
);
console.log(gas);  // "21000"
```

### Wallet Management

#### `cf.wallets.getAll()`

Get all linked wallets.

```javascript
const wallets = await cf.wallets.getAll();
wallets.forEach(wallet => {
  console.log(wallet.address);
  console.log(wallet.chain);
  console.log(wallet.isPrimary);
});
```

#### `cf.wallets.link(wallet)`

Link a new wallet to the account.

```javascript
await cf.wallets.link({
  address: '0x1234...',
  chain: 'solana',
  type: 'solana',
  label: 'My Solana Wallet'
});
```

#### `cf.wallets.unlink(walletId)`

Unlink a wallet.

```javascript
await cf.wallets.unlink('wallet-id');
```

#### `cf.wallets.setPrimary(walletId)`

Set a wallet as primary.

```javascript
await cf.wallets.setPrimary('wallet-id');
```

### Webhooks (Event Subscriptions)

#### `cf.webhooks.on(event, callback)`

Subscribe to on-chain events.

```javascript
// Subscribe to new transactions
const unsubscribe = cf.webhooks.on('transaction', (tx) => {
  console.log('New transaction:', tx.hash);
  console.log(tx.summary);
});

// Later: unsubscribe
unsubscribe();
```

## 🎯 Real-World Examples

### DeFi Dashboard

```javascript
import { ChainForge } from '@chainforge/sdk';

const cf = new ChainForge({ apiKey: '...' });

// Auto-restore session
await cf.restoreSession();

// Get all user data in parallel
const [balance, history, wallets] = await Promise.all([
  cf.data.getBalance(),
  cf.data.getHistory({ limit: 10 }),
  cf.wallets.getAll()
]);

// Render dashboard
renderDashboard({
  balance: `${balance.formatted} ${balance.symbol}`,
  transactions: history.map(tx => ({
    description: tx.summary,
    time: tx.display.timeAgo,
    status: tx.display.statusConfig.label,
    link: tx.display.explorerUrl
  })),
  wallets: wallets.map(w => ({
    address: w.shortAddress,
    chain: w.chain,
    isPrimary: w.isPrimary
  }))
});
```

### NFT Marketplace Integration

```javascript
// Connect wallet
const { user } = await cf.auth.connectWallet('metamask', { chain: 'polygon' });

// Buy NFT - one line transaction
const tx = await cf.transactions.send({
  to: nftContractAddress,
  amount: '0.05 MATIC',
  data: encodeBuyNFT(tokenId)  // Your encoding function
});

await tx.wait();
alert('NFT purchased successfully!');
```

### Multi-Chain Wallet Viewer

```javascript
const cf = new ChainForge({ apiKey: '...' });
await cf.auth.connectWallet('metamask');

// Get balances across all chains
const chains = ['ethereum', 'polygon', 'bnb', 'avalanche', 'arbitrum', 'optimism'];
const balances = await Promise.all(
  chains.map(chain => cf.data.getBalance(null, chain).catch(() => null))
);

// Show portfolio
const portfolio = chains.reduce((acc, chain, i) => {
  if (balances[i]) acc[chain] = balances[i];
  return acc;
}, {});

console.log(portfolio);
// {
//   ethereum: { formatted: "1.5", symbol: "ETH" },
//   polygon: { formatted: "100", symbol: "MATIC" },
//   ...
// }
```

## 🔧 Configuration

### Constructor Options

```javascript
const cf = new ChainForge({
  apiKey: 'required-api-key',
  baseURL: 'https://api.chainforge.io',  // Optional
  timeout: 30000  // Request timeout in ms
});
```

### Error Handling

```javascript
import { ChainForge, ChainForgeError } from '@chainforge/sdk';

try {
  await cf.auth.connectWallet('metamask');
} catch (error) {
  if (error instanceof ChainForgeError) {
    console.log(error.code);     // 'WALLET_NOT_INSTALLED'
    console.log(error.message);  // 'MetaMask is not installed'
    console.log(error.status);   // HTTP status code
    
    // Show user-friendly message
    if (error.code === 'WALLET_NOT_INSTALLED') {
      showInstallPrompt(error.installUrl);
    }
  }
}
```

### Error Codes

- `WALLET_NOT_INSTALLED` - User needs to install wallet extension
- `USER_REJECTED` - User rejected the connection/transaction
- `NOT_AUTHENTICATED` - User needs to login first
- `MISSING_ADDRESS` - No wallet address provided
- `INVALID_AMOUNT` - Wrong format for amount
- `NETWORK_ERROR` - Connection issue
- `CHAIN_NOT_SUPPORTED` - Selected chain not available

## 🌐 Supported Chains

| Chain | ID | Type | Wallets |
|-------|-----|------|---------|
| Ethereum | `ethereum` | EVM | MetaMask, Phantom (EVM), Brave, Coinbase, Trust |
| Polygon | `polygon` | EVM | MetaMask, Phantom (EVM), Brave, Coinbase, Trust |
| BNB Chain | `bnb` | EVM | MetaMask, Brave, Coinbase, Trust |
| Avalanche | `avalanche` | EVM | MetaMask, Brave, Coinbase, Trust |
| Arbitrum | `arbitrum` | EVM | MetaMask, Brave, Coinbase, Trust |
| Optimism | `optimism` | EVM | MetaMask, Brave, Coinbase, Trust |
| Solana | `solana` | Solana | Phantom, Brave, Coinbase, Trust |

## 📱 React Integration

```jsx
import { useEffect, useState } from 'react';
import { ChainForge } from '@chainforge/sdk';

const cf = new ChainForge({ apiKey: '...' });

function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    // Restore session on load
    cf.restoreSession().then(() => {
      setUser(cf.currentUser);
    });
  }, []);

  const connect = async () => {
    const { user } = await cf.auth.connectWallet('metamask');
    setUser(user);
    
    // Load balance
    const bal = await cf.data.getBalance();
    setBalance(bal);
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Connected: {user.address}</p>
          <p>Balance: {balance?.formatted} {balance?.symbol}</p>
          <button onClick={() => cf.auth.signOut()}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

## 🔒 Security

- API keys are scoped per project
- All requests use HTTPS
- Wallet private keys never leave the user's device
- Authentication via JWT with automatic refresh
- Rate limiting on all endpoints

## 📚 Resources

- [Documentation](https://docs.chainforge.io)
- [Dashboard](https://chainforge.io/dashboard)
- [GitHub](https://github.com/chainforge/sdk)
- [Discord](https://discord.gg/chainforge)

## 💡 Need Help?

- **Dashboard**: Manage API keys, view analytics, configure webhooks
- **Support**: support@chainforge.io
- **Discord**: Join our community for real-time help

---

**Built with ❤️ by the ChainForge team**

*Making Web3 as easy as Web2*
