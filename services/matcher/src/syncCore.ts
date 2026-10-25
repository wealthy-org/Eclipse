// Core sync logic extracted for reuse in CLI and daemon
import { sql } from "./db.js";
import { publicClient, ECLIPSE_ORDER_REGISTRY_ADDRESS, ECLIPSE_ORDER_REGISTRY_DEPLOY_BLOCK } from "./chain.js";
import { ORDER_REGISTRY_ABI } from "./abi.js";

export async function getSyncPoint(): Promise<bigint> {
  const rows = await sql<{ last_block: string }[]>`select last_block from sync_state where key = 'orders'`;
  if (rows.length === 0) return ECLIPSE_ORDER_REGISTRY_DEPLOY_BLOCK;
  return BigInt(rows[0].last_block);
}

export async function setSyncPoint(block: bigint) {
  await sql`
    insert into sync_state (key, last_block) values ('orders', ${block.toString()})
    on conflict (key) do update set last_block = excluded.last_block
  `;
}

export async function syncOrders(): Promise<number> {
  const fromBlock = await getSyncPoint();
  const toBlock = await publicClient.getBlockNumber();

  if (fromBlock > toBlock) {
    return 0;
  }

  const logs = await publicClient.getLogs({
    address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
    event: ORDER_REGISTRY_ABI.find((x) => x.type === "event" && x.name === "OrderSubmitted")!,
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    const a = log.args as {
      orderId: bigint;
      owner: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: bigint;
      minAmountOut: bigint;
      waveId: bigint;
      expiry: bigint;
    };

    const order = (await publicClient.readContract({
      address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
      abi: ORDER_REGISTRY_ABI,
      functionName: "orders",
      args: [a.orderId],
    })) as readonly [string, string, string, string, bigint, bigint, bigint, bigint, bigint, number];

    await sql`
      insert into orders (order_id, owner, token_in, token_out, amount_in, min_amount_out, wave_id, expiry, status, tx_hash)
      values (${a.orderId.toString()}, ${a.owner}, ${a.tokenIn}, ${a.tokenOut}, ${a.amountIn.toString()}, ${a.minAmountOut.toString()}, ${a.waveId.toString()}, ${a.expiry.toString()}, ${order[9]}, ${log.transactionHash})
      on conflict (order_id) do update set status = excluded.status, updated_at = now()
    `;
  }

  // Phase 2: Sync CommitmentSubmitted event logs
  const commitmentLogs = await publicClient.getLogs({
    address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
    event: ORDER_REGISTRY_ABI.find((x) => x.type === "event" && x.name === "CommitmentSubmitted")!,
    fromBlock,
    toBlock,
  });

  for (const clog of commitmentLogs) {
    const ca = clog.args as {
      orderId: bigint;
      owner: string;
      commitment: string;
      tokenIn: string;
      amountIn: bigint;
      waveId: bigint;
    };

    // Update commitments table if preimage already escrowed
    await sql`
      insert into commitments (commitment, order_id, owner, token_in, token_out, amount_in, min_amount_out, expiry, secret, wave_id, revealed)
      values (
        ${ca.commitment},
        ${ca.orderId.toString()},
        ${ca.owner.toLowerCase()},
        ${ca.tokenIn.toLowerCase()},
        '',
        ${ca.amountIn.toString()},
        '0',
        '0',
        '',
        ${ca.waveId.toString()},
        false
      )
      on conflict (commitment) do update set
        order_id = ${ca.orderId.toString()},
        wave_id = ${ca.waveId.toString()}
    `;

    // Also insert into orders table as status 2 (Locked in commitment)
    await sql`
      insert into orders (order_id, owner, token_in, token_out, amount_in, min_amount_out, wave_id, expiry, status, tx_hash)
      values (${ca.orderId.toString()}, ${ca.owner}, ${ca.tokenIn}, '0x0000000000000000000000000000000000000000', ${ca.amountIn.toString()}, '0', ${ca.waveId.toString()}, '0', 2, ${clog.transactionHash})
      on conflict (order_id) do update set status = excluded.status, updated_at = now()
    `;
  }

  // Also refresh status for all previously Open or Locked orders from chain
  const pendingOrders = await sql<{ order_id: string }[]>`
    select order_id from orders where status in (0, 2)
  `;

  for (const p of pendingOrders) {
    const orderData = (await publicClient.readContract({
      address: ECLIPSE_ORDER_REGISTRY_ADDRESS,
      abi: ORDER_REGISTRY_ABI,
      functionName: "orders",
      args: [BigInt(p.order_id)],
    })) as readonly [string, string, string, string, bigint, bigint, bigint, bigint, bigint, number];

    const currentStatus = orderData[9];
    await sql`
      update orders set status = ${currentStatus}, updated_at = now() where order_id = ${p.order_id}
    `;
  }

  await setSyncPoint(toBlock + 1n);
  return logs.length;
}
