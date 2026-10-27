import { defineChain } from "viem";

// Robinhood Chain Mainnet — Chain ID 4663 (0x1237), official RPC
export const robinhoodMainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

// Backward-compatibility alias
export const robinhoodTestnet = robinhoodMainnet;

