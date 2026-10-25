import { defineChain } from "viem";

// Robinhood Chain testnet. Not a built-in viem/wagmi chain, so defined here from the official
// docs (docs.robinhood.com/chain/connecting) — chain id 46630, confirmed live via eth_chainId.
export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  testnet: true,
});
