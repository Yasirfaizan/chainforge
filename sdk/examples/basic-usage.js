// Basic ChainForge SDK Usage Example
import { ChainForge } from '@chainforge/sdk';

// Initialize SDK
const cf = new ChainForge({
  apiKey: 'your-api-key',  // Get from chainforge.io/dashboard
  baseURL: 'https://api.chainforge.io'  // Optional: for self-hosted
});

async function basicExample() {
  console.log('🚀 ChainForge SDK Basic Example\n');

  try {
    // 1. Connect Wallet (One Line)
    console.log('📱 Connecting wallet...');
    const { user, token } = await cf.auth.connectWallet('metamask');
    console.log(`✅ Connected: ${user.address}`);
    console.log(`🔗 Chain: ${user.chain}`);

    // 2. Get Balance (Human-readable)
    console.log('\n💰 Getting balance...');
    const balance = await cf.data.getBalance();
    console.log(`💎 Balance: ${balance.formatted} ${balance.symbol}`);

    // 3. Get Transaction History (Auto-humanized)
    console.log('\n📜 Getting transaction history...');
    const history = await cf.data.getHistory({ limit: 5 });
    console.log(`📊 Found ${history.length} recent transactions:`);
    
    history.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.summary}`);
      console.log(`     ${tx.display.timeAgo} • ${tx.display.statusConfig.label}`);
    });

    // 4. Get All Linked Wallets
    console.log('\n🔐 Getting linked wallets...');
    const wallets = await cf.wallets.getAll();
    console.log(`📱 Found ${wallets.length} linked wallets:`);
    
    wallets.forEach(wallet => {
      const marker = wallet.isPrimary ? '⭐' : '  ';
      console.log(`${marker} ${wallet.address} (${wallet.chain})`);
    });

    // 5. Send Transaction (Abstracted Complexity)
    console.log('\n📤 Example: Send transaction...');
    console.log('Note: This is just an example - requires user confirmation');
    
    // Uncomment to actually send (requires user confirmation in wallet)
    /*
    const tx = await cf.transactions.send({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f8dEe',
      amount: '0.001 ETH'
    });
    
    console.log(`🔗 Transaction: ${tx.hash}`);
    console.log(`🌐 Explorer: ${tx.explorer}`);
    
    await tx.wait();
    console.log('✅ Transaction confirmed!');
    */

    console.log('\n🎉 Example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'WALLET_NOT_INSTALLED') {
      console.log('💡 Please install MetaMask to use this example');
    } else if (error.code === 'USER_REJECTED') {
      console.log('💡 User rejected the request');
    }
  }
}

// Run example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicExample();
}

export { basicExample };
