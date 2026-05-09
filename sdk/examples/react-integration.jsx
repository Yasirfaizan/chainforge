// React Integration Example
import { useEffect, useState } from 'react';
import { ChainForge } from '@chainforge/sdk';

// Initialize SDK outside component to prevent re-initialization
const cf = new ChainForge({
  apiKey: process.env.REACT_APP_CHAINFORGE_API_KEY || 'your-api-key'
});

export function ChainForgeProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Restore session on component mount
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // Try to restore existing session
        await cf.restoreSession();
        const currentUser = cf.auth.getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Failed to initialize ChainForge:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const connectWallet = async (walletType = 'metamask') => {
    try {
      setLoading(true);
      setError(null);
      
      const { user: connectedUser } = await cf.auth.connectWallet(walletType);
      setUser(connectedUser);
      
      return connectedUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      await cf.auth.signOut();
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    connectWallet,
    disconnect,
    cf // Expose SDK instance for advanced usage
  };

  return (
    <ChainForgeContext.Provider value={value}>
      {children}
    </ChainForgeContext.Provider>
  );
}

const ChainForgeContext = React.createContext();

export function useChainForge() {
  const context = React.useContext(ChainForgeContext);
  if (!context) {
    throw new Error('useChainForge must be used within ChainForgeProvider');
  }
  return context;
}

// Example Components
export function WalletButton() {
  const { user, connectWallet, disconnect, loading } = useChainForge();

  if (loading) {
    return <button disabled>Connecting...</button>;
  }

  if (user) {
    return (
      <div>
        <p>Connected: {user.address.slice(0, 6)}...{user.address.slice(-4)}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <button onClick={() => connectWallet('metamask')}>
      Connect MetaMask
    </button>
  );
}

export function BalanceDisplay() {
  const { user, cf } = useChainForge();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (user) {
      cf.data.getBalance().then(setBalance);
    }
  }, [user, cf]);

  if (!user || !balance) {
    return <div>Connect wallet to see balance</div>;
  }

  return (
    <div>
      <h3>Balance</h3>
      <p>{balance.formatted} {balance.symbol}</p>
    </div>
  );
}

export function TransactionHistory() {
  const { user, cf } = useChainForge();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      cf.data.getHistory({ limit: 10 })
        .then(setTransactions)
        .finally(() => setLoading(false));
    }
  }, [user, cf]);

  if (!user) {
    return <div>Connect wallet to see transactions</div>;
  }

  if (loading) {
    return <div>Loading transactions...</div>;
  }

  return (
    <div>
      <h3>Recent Transactions</h3>
      {transactions.length === 0 ? (
        <p>No transactions found</p>
      ) : (
        <ul>
          {transactions.map((tx, index) => (
            <li key={index}>
              <div>{tx.summary}</div>
              <small>{tx.display.timeAgo} • {tx.display.statusConfig.label}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Complete Example App
export function ChainForgeApp() {
  return (
    <ChainForgeProvider>
      <div className="app">
        <header>
          <h1>ChainForge React Example</h1>
          <WalletButton />
        </header>
        
        <main>
          <BalanceDisplay />
          <TransactionHistory />
        </main>
      </div>
    </ChainForgeProvider>
  );
}
