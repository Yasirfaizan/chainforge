export const WALLET_CHAIN_MATRIX = {
  metamask: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: false, sui: false, bitcoin: false },
  phantom: { ethereum: true, polygon: true, bnb: true, avalanche: false, arbitrum: false, optimism: false, base: true, zksync: false, linea: false, solana: true, sui: false, bitcoin: false },
  brave: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: false, sui: false, bitcoin: false },
  coinbase: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: false, sui: false, bitcoin: false },
  trust: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: false, sui: false, bitcoin: false },
  okx: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: false, sui: false, bitcoin: false },
  rabby: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: false, sui: false, bitcoin: false },
  rainbow: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: false, sui: false, bitcoin: false },
  walletconnect: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: false, sui: false, bitcoin: false },
  ledger: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: true, sui: false, bitcoin: true },
  backpack: { ethereum: true, polygon: true, bnb: true, avalanche: true, arbitrum: true, optimism: true, base: true, zksync: true, linea: true, solana: true, sui: false, bitcoin: false },
  suiWallet: { ethereum: false, polygon: false, bnb: false, avalanche: false, arbitrum: false, optimism: false, base: false, zksync: false, linea: false, solana: false, sui: true, bitcoin: false },
};

export function walletSupportsChain(walletId, chainId) {
  return Boolean(WALLET_CHAIN_MATRIX?.[walletId]?.[chainId]);
}

