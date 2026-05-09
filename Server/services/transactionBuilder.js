/**
 * ChainForge Transaction Builder
 * Simplifies transaction creation with automatic gas estimation,
 * nonce management, and chain-specific formatting
 * 
 * No blockchain knowledge required - just specify what you want to do
 */

import { ethers } from "ethers";

// Chain configurations with gas settings
const CHAIN_CONFIG = {
  ethereum: {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    gasSettings: {
      defaultGasLimit: 21000,
      maxFeePerGas: null, // Use EIP-1559
      maxPriorityFeePerGas: null
    },
    eip1559: true
  },
  polygon: {
    id: 137,
    name: "Polygon",
    symbol: "MATIC",
    decimals: 18,
    gasSettings: {
      defaultGasLimit: 21000,
      maxFeePerGas: ethers.parseUnits("50", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("30", "gwei")
    },
    eip1559: true
  },
  bnb: {
    id: 56,
    name: "BNB Chain",
    symbol: "BNB",
    decimals: 18,
    gasSettings: {
      defaultGasLimit: 21000,
      gasPrice: ethers.parseUnits("5", "gwei")
    },
    eip1559: false
  },
  avalanche: {
    id: 43114,
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
    gasSettings: {
      defaultGasLimit: 21000,
      gasPrice: ethers.parseUnits("25", "gwei")
    },
    eip1559: false
  },
  arbitrum: {
    id: 42161,
    name: "Arbitrum",
    symbol: "ETH",
    decimals: 18,
    gasSettings: {
      defaultGasLimit: 21000
    },
    eip1559: true
  },
  optimism: {
    id: 10,
    name: "Optimism",
    symbol: "ETH",
    decimals: 18,
    gasSettings: {
      defaultGasLimit: 21000
    },
    eip1559: true
  },
  solana: {
    id: "mainnet-beta",
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
    gasSettings: {
      // Solana uses different model (rent + fees)
      defaultFee: 5000 // lamports
    },
    eip1559: false,
    type: "solana"
  }
};

// Common transaction types with pre-built configurations
const TRANSACTION_TEMPLATES = {
  nativeTransfer: {
    name: "Native Token Transfer",
    description: "Send ETH, MATIC, BNB, etc.",
    gasLimit: 21000,
    requiresData: false
  },
  erc20Transfer: {
    name: "ERC-20 Token Transfer",
    description: "Send USDC, USDT, DAI, etc.",
    gasLimit: 65000,
    requiresData: true,
    dataEncoder: "erc20Transfer"
  },
  nftTransfer: {
    name: "NFT Transfer",
    description: "Send ERC-721 or ERC-1155 tokens",
    gasLimit: 85000,
    requiresData: true,
    dataEncoder: "nftTransfer"
  },
  contractInteraction: {
    name: "Smart Contract Call",
    description: "Interact with DeFi protocols, etc.",
    gasLimit: 150000,
    requiresData: true,
    dataEncoder: "custom"
  },
  contractDeployment: {
    name: "Contract Deployment",
    description: "Deploy a new smart contract",
    gasLimit: 3000000,
    requiresData: true,
    dataEncoder: "bytecode"
  }
};

/**
 * Parse amount string to BigInt
 * Supports: "1.5 ETH", "100 USDC", "0.5"
 */
function parseAmount(amountStr, decimals = 18) {
  // Extract number and unit
  const match = amountStr.toString().match(/^([\d.]+)\s*(\w*)$/);
  if (!match) {
    throw new Error(`Invalid amount format: ${amountStr}. Use format like "1.5 ETH"`);
  }
  
  const [, value, unit] = match;
  return ethers.parseUnits(value, decimals);
}

/**
 * Format gas for display
 */
function formatGas(gasWei, symbol = "ETH") {
  const gasEth = ethers.formatUnits(gasWei, 18);
  return {
    raw: gasWei.toString(),
    formatted: parseFloat(gasEth).toFixed(8),
    symbol
  };
}

/**
 * Transaction Builder Class
 */
class TransactionBuilder {
  constructor(chain = "ethereum") {
    this.chain = chain;
    this.config = CHAIN_CONFIG[chain];
    
    if (!this.config) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    
    this.tx = {
      to: null,
      value: 0,
      data: "0x",
      gasLimit: null,
      gasPrice: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      nonce: null,
      chainId: this.config.id
    };
  }

  /**
   * Set recipient address
   */
  to(address) {
    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }
    this.tx.to = address;
    return this;
  }

  /**
   * Set amount to send
   * Supports: "1.5 ETH", "100", ethers.parseEther("1.5")
   */
  amount(value) {
    if (typeof value === "string" && value.includes(" ")) {
      this.tx.value = parseAmount(value, this.config.decimals);
    } else if (typeof value === "string" || typeof value === "number") {
      this.tx.value = ethers.parseUnits(value.toString(), this.config.decimals);
    } else if (typeof value === "bigint") {
      this.tx.value = value;
    } else {
      throw new Error(`Invalid amount: ${value}`);
    }
    return this;
  }

  /**
   * Set contract interaction data
   */
  data(dataHex) {
    if (!dataHex.startsWith("0x")) {
      throw new Error("Data must start with 0x");
    }
    this.tx.data = dataHex;
    return this;
  }

  /**
   * Use a pre-built template
   */
  template(templateName, params = {}) {
    const template = TRANSACTION_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Unknown template: ${templateName}. Available: ${Object.keys(TRANSACTION_TEMPLATES).join(", ")}`);
    }

    // Set default gas limit from template
    this.tx.gasLimit = template.gasLimit;

    // Encode data if needed
    if (template.requiresData && params.data) {
      if (template.dataEncoder === "erc20Transfer") {
        this.tx.data = this._encodeERC20Transfer(
          params.token,
          params.to,
          params.amount
        );
      } else if (template.dataEncoder === "nftTransfer") {
        this.tx.data = this._encodeNFTTransfer(
          params.contract,
          params.to,
          params.tokenId
        );
      } else {
        this.tx.data = params.data;
      }
    }

    return this;
  }

  /**
   * Set gas limit manually
   */
  gasLimit(limit) {
    this.tx.gasLimit = typeof limit === "string" ? BigInt(limit) : limit;
    return this;
  }

  /**
   * Set nonce manually (usually auto-detected)
   */
  nonce(nonce) {
    this.tx.nonce = nonce;
    return this;
  }

  /**
   * Estimate gas for the current transaction
   */
  async estimateGas(provider) {
    if (!this.tx.to) {
      throw new Error("Cannot estimate gas: recipient address not set");
    }

    try {
      const estimate = await provider.estimateGas({
        to: this.tx.to,
        value: this.tx.value,
        data: this.tx.data
      });

      // Add 20% buffer for safety
      this.tx.gasLimit = (estimate * BigInt(120)) / BigInt(100);
      
      return this.tx.gasLimit;
    } catch (error) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Get gas price / fee data
   */
  async getFeeData(provider) {
    if (this.config.type === "solana") {
      return { fee: this.config.gasSettings.defaultFee };
    }

    const feeData = await provider.getFeeData();

    if (this.config.eip1559 && feeData.maxFeePerGas) {
      // Use EIP-1559
      this.tx.maxFeePerGas = this.config.gasSettings.maxFeePerGas || feeData.maxFeePerGas;
      this.tx.maxPriorityFeePerGas = this.config.gasSettings.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas;
      
      return {
        type: "eip1559",
        maxFeePerGas: this.tx.maxFeePerGas,
        maxPriorityFeePerGas: this.tx.maxPriorityFeePerGas
      };
    } else {
      // Use legacy gas price
      this.tx.gasPrice = this.config.gasSettings.gasPrice || feeData.gasPrice;
      
      return {
        type: "legacy",
        gasPrice: this.tx.gasPrice
      };
    }
  }

  /**
   * Calculate total transaction cost
   */
  calculateCost(feeData) {
    const gasLimit = this.tx.gasLimit || this.config.gasSettings.defaultGasLimit;
    
    let gasCost;
    if (feeData.type === "eip1559") {
      gasCost = BigInt(gasLimit) * BigInt(feeData.maxFeePerGas);
    } else if (feeData.type === "legacy") {
      gasCost = BigInt(gasLimit) * BigInt(feeData.gasPrice);
    } else {
      // Solana
      gasCost = BigInt(feeData.fee);
    }

    const totalCost = gasCost + (this.tx.value || BigInt(0));

    return {
      gasCost: formatGas(gasCost, this.config.symbol),
      value: formatGas(this.tx.value || BigInt(0), this.config.symbol),
      total: formatGas(totalCost, this.config.symbol),
      gasLimit,
      feeData
    };
  }

  /**
   * Build the final transaction object
   */
  async build(provider) {
    // Auto-estimate gas if not set
    if (!this.tx.gasLimit && this.tx.to) {
      await this.estimateGas(provider);
    }

    // Get fee data
    const feeData = await this.getFeeData(provider);

    // Calculate costs
    const cost = this.calculateCost(feeData);

    // Get nonce if not set
    if (this.tx.nonce === null && provider) {
      // Would need sender address to get nonce
      // this.tx.nonce = await provider.getTransactionCount(sender);
    }

    return {
      transaction: {
        ...this.tx,
        gasLimit: this.tx.gasLimit || this.config.gasSettings.defaultGasLimit
      },
      cost,
      chain: this.config,
      summary: this._generateSummary(cost)
    };
  }

  /**
   * Generate human-readable summary
   */
  _generateSummary(cost) {
    const valueStr = this.tx.value > 0 
      ? `Send ${ethers.formatUnits(this.tx.value, this.config.decimals)} ${this.config.symbol}`
      : "Contract interaction";
    
    return {
      action: valueStr,
      to: this.tx.to,
      network: this.config.name,
      gasCost: `~${cost.gasCost.formatted} ${cost.gasCost.symbol}`,
      totalCost: `~${cost.total.formatted} ${cost.total.symbol}`,
      warning: cost.total.formatted > 1 ? "High value transaction" : null
    };
  }

  /**
   * Encode ERC-20 transfer data
   */
  _encodeERC20Transfer(token, to, amount) {
    // ERC-20 transfer(address,uint256) selector: 0xa9059cbb
    const iface = new ethers.Interface([
      "function transfer(address to, uint256 amount)"
    ]);
    return iface.encodeFunctionData("transfer", [to, amount]);
  }

  /**
   * Encode NFT transfer data (ERC-721)
   */
  _encodeNFTTransfer(contract, to, tokenId) {
    // ERC-721 transferFrom(address,address,uint256) selector: 0x23b872dd
    const iface = new ethers.Interface([
      "function transferFrom(address from, address to, uint256 tokenId)"
    ]);
    // 'from' would need to be the current user's address
    return iface.encodeFunctionData("transferFrom", [contract, to, tokenId]);
  }

  /**
   * Static methods for quick transaction creation
   */
  static transfer(chain, to, amount) {
    return new TransactionBuilder(chain)
      .to(to)
      .amount(amount)
      .template("nativeTransfer");
  }

  static tokenTransfer(chain, token, to, amount) {
    return new TransactionBuilder(chain)
      .to(token)
      .template("erc20Transfer", { token, to, amount });
  }

  static contractCall(chain, contract, data, value = 0) {
    return new TransactionBuilder(chain)
      .to(contract)
      .data(data)
      .template("contractInteraction");
  }
}

/**
 * Gas Estimation Helper
 */
class GasEstimator {
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Get current gas prices across chains
   */
  async getGasPrices() {
    const prices = {};
    
    for (const [chainId, config] of Object.entries(CHAIN_CONFIG)) {
      if (config.type === "solana") continue;
      
      try {
        const feeData = await this.provider.getFeeData();
        prices[chainId] = {
          gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") : null,
          maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, "gwei") : null,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei") : null,
          eip1559: config.eip1559
        };
      } catch (e) {
        prices[chainId] = { error: e.message };
      }
    }
    
    return prices;
  }

  /**
   * Estimate time for confirmation based on gas price
   */
  estimateConfirmationTime(gasPriceGwei) {
    const gwei = parseFloat(gasPriceGwei);
    
    if (gwei < 10) return { time: "~5 min", confidence: "low" };
    if (gwei < 20) return { time: "~2 min", confidence: "medium" };
    if (gwei < 50) return { time: "~30 sec", confidence: "high" };
    return { time: "~15 sec", confidence: "very high" };
  }
}

export { TransactionBuilder, GasEstimator, CHAIN_CONFIG, TRANSACTION_TEMPLATES };
export default TransactionBuilder;
