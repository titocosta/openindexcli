export const API_BASE_URL = "https://chat.openindex.ai/api";
// Chain configurations
export const CHAIN_CONFIGS = {
    eth: {
        name: "Ethereum",
        rpcUrl: process.env.ETH_RPC_URL || "https://cloudflare-eth.com",
        chainId: 1,
    },
    base: {
        name: "Base",
        rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
        chainId: 8453,
    },
    bsc: {
        name: "BSC",
        rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
        chainId: 56,
    },
};
//# sourceMappingURL=constants.js.map