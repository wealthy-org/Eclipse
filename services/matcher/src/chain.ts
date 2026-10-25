import "dotenv/config";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ROBINHOOD_TESTNET_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com"] } },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(),
});

const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;
export const matcherAccount = privateKey ? privateKeyToAccount(privateKey) : undefined;

export const walletClient = matcherAccount
  ? createWalletClient({ account: matcherAccount, chain: robinhoodTestnet, transport: http() })
  : undefined;

export const ECLIPSE_ORDER_REGISTRY_ADDRESS = (process.env.ECLIPSE_ORDER_REGISTRY_ADDRESS ??
  "0xA697AD15EB193c7e23c4208606587c2FEfDf92ad") as `0x${string}`;

export const ECLIPSE_HOOK_ADDRESS = (process.env.ECLIPSE_HOOK_ADDRESS ??
  "0x47c68C343C422790F998e9F777865554732560c4") as `0x${string}`;

export const ECLIPSE_BATCH_VERIFIER_ADDRESS = (process.env.ECLIPSE_BATCH_VERIFIER_ADDRESS ??
  "0x5b19C43F23DBfe73292FFC22a4147322ab90104F") as `0x${string}`;

export const ECLIPSE_PRIVATE_SETTLEMENT_ADDRESS = (process.env.ECLIPSE_PRIVATE_SETTLEMENT_ADDRESS ??
  "0xAe07dB429A0902fB7f505a296E12C254A468eA74") as `0x${string}`;

export const SPECTER_ECLIPSE_ADAPTER_ADDRESS = (process.env.SPECTER_ECLIPSE_ADAPTER_ADDRESS ??
  "0xcB548BA082ADA0D4FD37E8Cea4017212d6204343") as `0x${string}`;

export const ECLIPSE_EXECUTOR_ROUTE_ADDRESS = (process.env.ECLIPSE_EXECUTOR_ROUTE_ADDRESS ??
  "0xbBB7B5d51eAA07fBBc055fa2053F75376F8c3265") as `0x${string}`;

export const POOL_MANAGER_ADDRESS = (process.env.POOL_MANAGER_ADDRESS ??
  "0x8366a39cc670b4001a1121b8f6a443a643e40951") as `0x${string}`;

export const ECLIPSE_ORDER_REGISTRY_DEPLOY_BLOCK = BigInt(process.env.ECLIPSE_ORDER_REGISTRY_DEPLOY_BLOCK ?? "142478553");

export const MOCK_WETH_ADDRESS = (process.env.MOCK_WETH_ADDRESS ?? "0xb8A83409F449A87D73034F87EdDd191d97D72Dc6").toLowerCase();
export const MOCK_USDG_ADDRESS = (process.env.MOCK_USDG_ADDRESS ?? "0x223F45A00B3212f4ec052450624C63eC457F2482").toLowerCase();
export const MOCK_PONS_ADDRESS = (process.env.MOCK_PONS_ADDRESS ?? "0xB1f64237714bFAf6941911aE821e66e8BbD01143").toLowerCase();
export const MOCK_NVDA_ADDRESS = (process.env.MOCK_NVDA_ADDRESS ?? "0xdD453d93A8DCB74D75eD2aaD6bD967059d0BC545").toLowerCase();
