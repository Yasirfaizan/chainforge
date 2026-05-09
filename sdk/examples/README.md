# ChainForge SDK Examples

This directory contains practical examples of how to use the ChainForge SDK in various scenarios.

## 📁 Examples Overview

### 1. **Basic Usage** (`basic-usage.js`)
Demonstrates core SDK functionality:
- Wallet connection
- Balance retrieval
- Transaction history
- Wallet management

**Run:**
```bash
npm run basic
```

### 2. **React Integration** (`react-integration.jsx`)
Complete React integration with:
- Custom hooks (`useChainForge`)
- Context Provider
- Example components
- State management

**Usage:**
```jsx
import { ChainForgeProvider, WalletButton, BalanceDisplay } from './react-integration';

function App() {
  return (
    <ChainForgeProvider>
      <WalletButton />
      <BalanceDisplay />
    </ChainForgeProvider>
  );
}
```

### 3. **Multi-Chain Portfolio** (`multichain-portfolio.js`)
Advanced multi-chain functionality:
- Portfolio across 7 chains
- Transaction analysis
- Performance metrics
- Data synchronization

**Run:**
```bash
npm run portfolio
```

## 🚀 Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Set your API key:**
```bash
export CHAINFORGE_API_KEY=your-api-key-here
```

3. **Run examples:**
```bash
# Run all examples
npm run all

# Run specific example
npm run basic
npm run portfolio
```

## 🔧 Configuration

All examples use the ChainForge SDK with these configuration options:

```javascript
const cf = new ChainForge({
  apiKey: process.env.CHAINFORGE_API_KEY || 'your-api-key',
  baseURL: 'https://api.chainforge.io'  // Optional
});
```

## 📚 Learn More

- [Full SDK Documentation](../README.md)
- [API Reference](https://docs.chainforge.io)
- [ChainForge Dashboard](https://chainforge.io/dashboard)

## 🤝 Contributing

Have an example to share? Please:

1. Create a new file in this directory
2. Follow the existing naming convention
3. Add documentation
4. Update this README

## 📝 Example Templates

### Creating a New Example

```javascript
// your-example.js
import { ChainForge } from '@chainforge/sdk';

const cf = new ChainForge({
  apiKey: process.env.CHAINFORGE_API_KEY
});

async function yourExample() {
  try {
    // Your code here
    console.log('✅ Example completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  yourExample();
}

export { yourExample };
```

### Adding to package.json

```json
{
  "scripts": {
    "your-example": "node your-example.js"
  }
}
```

## 🔍 Common Patterns

### Error Handling

```javascript
try {
  const result = await cf.someMethod();
} catch (error) {
  if (error.code === 'WALLET_NOT_INSTALLED') {
    // Handle wallet not installed
  } else if (error.code === 'USER_REJECTED') {
    // Handle user rejection
  } else {
    // Handle other errors
  }
}
```

### Async Operations

```javascript
// Parallel operations
const [balance, history, wallets] = await Promise.all([
  cf.data.getBalance(),
  cf.data.getHistory(),
  cf.wallets.getAll()
]);

// Sequential operations
const user = await cf.auth.connectWallet('metamask');
const balance = await cf.data.getBalance();
```

### React Integration

```jsx
import { useChainForge } from './react-integration';

function MyComponent() {
  const { user, connectWallet, cf } = useChainForge();
  
  const handleConnect = async () => {
    await connectWallet('metamask');
  };
  
  return (
    <div>
      {user ? <ConnectedView /> : <ConnectButton onClick={handleConnect} />}
    </div>
  );
}
```

## 🐛 Troubleshooting

### Common Issues

1. **"WALLET_NOT_INSTALLED"**
   - Install the required wallet extension
   - Check wallet is enabled in browser

2. **"USER_REJECTED"**
   - User cancelled the operation
   - Try again with user confirmation

3. **Network Issues**
   - Check internet connection
   - Verify API key is valid

4. **Balance Shows 0**
   - Check if wallet has funds
   - Verify correct network is selected

### Debug Mode

Enable debug logging:

```javascript
const cf = new ChainForge({
  apiKey: 'your-api-key',
  debug: true  // Enable console logging
});
```

## 📞 Support

- **Documentation**: [docs.chainforge.io](https://docs.chainforge.io)
- **Issues**: [GitHub Issues](https://github.com/chainforge/sdk/issues)
- **Discord**: [Community Chat](https://discord.gg/chainforge)
- **Email**: support@chainforge.io

---

Happy coding with ChainForge! 🚀
