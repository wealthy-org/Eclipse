import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, parseEther, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodTestnet } from "../../lib/chains";
import { MOCK_TOKENS } from "../../lib/contracts";

// Faucet relayer private key (testnet deployer wallet with massive initial supplies)
const FAUCET_KEY = (process.env.PRIVATE_KEY ?? "0x330fa80967e9e39db0dc28b0a4d82a91726b91701dd650cf29b0cc0ea2a902fd") as `0x${string}`;

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, symbol } = body;

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: "Invalid target Ethereum address" }, { status: 400 });
    }

    const tokenMap: Record<string, { address: `0x${string}`; amount: bigint; label: string }> = {
      WETH: { address: MOCK_TOKENS.WETH, amount: parseEther("0.1"), label: "0.1 WETH" },
      USDG: { address: MOCK_TOKENS.USDG, amount: parseEther("500"), label: "500 USDG" },
      NVDA: { address: MOCK_TOKENS.NVDA, amount: parseEther("5"), label: "5 NVDA" },
      PONS: { address: MOCK_TOKENS.PONS, amount: parseEther("100"), label: "100 PONS" },
    };

    const targetToken = tokenMap[symbol?.toUpperCase()];
    if (!targetToken) {
      return NextResponse.json(
        { error: "Unknown token symbol. Supported: WETH, USDG, NVDA, PONS" },
        { status: 400 }
      );
    }

    const account = privateKeyToAccount(FAUCET_KEY);
    const client = createWalletClient({
      account,
      chain: robinhoodTestnet,
      transport: http(),
    });

    const hash = await client.writeContract({
      address: targetToken.address,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [address as `0x${string}`, targetToken.amount],
    });

    return NextResponse.json({
      success: true,
      hash,
      symbol: symbol.toUpperCase(),
      amount: targetToken.label,
      recipient: address,
    });
  } catch (err: any) {
    console.error("[Faucet API Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to dispense test tokens" },
      { status: 500 }
    );
  }
}
