// Multi-Chain Portfolio Example
import { ChainForge } from '@chainforge/sdk';

const cf = new ChainForge({
  apiKey: 'your-api-key'
});

async function multiChainPortfolio() {
  console.log('🌐 Multi-Chain Portfolio Example\n');

  try {
    // Connect wallet first
    console.log('📱 Connecting wallet...');
    const { user } = await cf.auth.connectWallet('metamask');
    console.log(`✅ Connected: ${user.address}`);

    // Supported chains
    const chains = [
      'ethereum',
      'polygon', 
      'bnb',
      'avalanche',
      'arbitrum',
      'optimism',
      'solana'
    ];

    console.log('\n💰 Fetching balances across all chains...');
    
    // Get balances across all chains in parallel
    const balancePromises = chains.map(async (chain) => {
      try {
        const balance = await cf.data.getBalance(user.address, chain);
        return { chain, balance, success: true };
      } catch (error) {
        console.log(`⚠️  ${chain}: No balance or error`);
        return { chain, error, success: false };
      }
    });

    const results = await Promise.all(balancePromises);
    
    // Display portfolio
    console.log('\n📊 Portfolio Summary:');
    console.log('=' .repeat(50));
    
    let totalValueUSD = 0;
    const portfolio = {};

    results.forEach(({ chain, balance, success }) => {
      if (success && balance && parseFloat(balance.formatted) > 0) {
        portfolio[chain] = balance;
        console.log(`${chain.toUpperCase().padEnd(12)}: ${balance.formatted.padEnd(10)} ${balance.symbol}`);
        
        // Note: In a real app, you'd fetch current prices
        // For demo, we'll use mock prices
        const mockPrices = {
          'ETH': 2000,
          'MATIC': 0.8,
          'BNB': 300,
          'AVAX': 15,
          'SOL': 60
        };
        
        const price = mockPrices[balance.symbol] || 1;
        const value = parseFloat(balance.formatted) * price;
        totalValueUSD += value;
      }
    });

    console.log('=' .repeat(50));
    console.log(`💎 Total Portfolio Value: ~$${totalValueUSD.toFixed(2)} USD`);

    // Get transaction history for each chain with balance
    console.log('\n📜 Recent Activity Across Chains:');
    
    for (const [chain, balance] of Object.entries(portfolio)) {
      try {
        const history = await cf.data.getHistory({ 
          address: user.address, 
          chain, 
          limit: 3 
        });
        
        if (history.length > 0) {
          console.log(`\n${chain.toUpperCase()} (${history.length} recent):`);
          history.forEach((tx, index) => {
            console.log(`  ${index + 1}. ${tx.summary}`);
            console.log(`     ${tx.display.timeAgo}`);
          });
        }
      } catch (error) {
        console.log(`⚠️  Could not fetch history for ${chain}`);
      }
    }

    // Sync all chains for caching
    console.log('\n🔄 Syncing blockchain data...');
    const syncResult = await cf.data.sync();
    console.log(`✅ Synced ${syncResult.synced} transactions across all chains`);

    console.log('\n🎉 Multi-chain portfolio analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Advanced portfolio analysis
async function advancedPortfolioAnalysis() {
  console.log('\n🔬 Advanced Portfolio Analysis\n');

  try {
    const { user } = await cf.auth.connectWallet('metamask');
    
    // Get all linked wallets
    const wallets = await cf.wallets.getAll();
    console.log(`📱 Found ${wallets.length} linked wallets`);
    
    // Analyze each wallet
    for (const wallet of wallets) {
      console.log(`\n🔍 Analyzing ${wallet.address} (${wallet.chain})`);
      
      // Get detailed balance
      const balance = await cf.data.getBalance(wallet.address, wallet.chain);
      console.log(`   Balance: ${balance.formatted} ${balance.symbol}`);
      
      // Get transaction count
      const history = await cf.data.getHistory({ 
        address: wallet.address, 
        chain: wallet.chain,
        limit: 100 
      });
      
      console.log(`   Transactions: ${history.length} total`);
      
      // Calculate transaction frequency
      if (history.length > 0) {
        const oldestTx = history[history.length - 1];
        const daysSince = (Date.now() - new Date(oldestTx.timestamp)) / (1000 * 60 * 60 * 24);
        const frequency = history.length / Math.max(daysSince, 1);
        console.log(`   Frequency: ${frequency.toFixed(2)} transactions/day`);
      }
      
      // Analyze transaction patterns
      const sentTxs = history.filter(tx => tx.from.toLowerCase() === wallet.address.toLowerCase());
      const receivedTxs = history.filter(tx => tx.to.toLowerCase() === wallet.address.toLowerCase());
      
      console.log(`   Sent: ${sentTxs.length}, Received: ${receivedTxs.length}`);
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

// Run examples if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await multiChainPortfolio();
  await advancedPortfolioAnalysis();
}

export { multiChainPortfolio, advancedPortfolioAnalysis };
