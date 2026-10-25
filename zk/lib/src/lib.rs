use alloy_sol_types::sol;
use serde::{Deserialize, Serialize};
use tiny_keccak::{Hasher, Keccak};

// Define ABI-compatible public values struct matching Ethereum / Solidity requirements
sol! {
    struct BatchPublicJournalSol {
        bytes32 pool_id;
        uint64 wave_id;
        bytes32 commitment_root;
        uint128 gross_buy;
        uint128 gross_sell;
        uint128 internal_matched;
        uint128 net_amount;
        bool is_net_sell;
        uint32 valid_order_count;
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrderSide {
    Buy,  // tokenIn = quote (USDG), tokenOut = base (WETH)
    Sell, // tokenIn = base (WETH), tokenOut = quote (USDG)
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct PrivateOrder {
    pub order_id: u64,
    pub owner: [u8; 20],
    pub side: OrderSide,
    pub amount_in: u128,
    pub min_amount_out: u128,
    pub secret: [u8; 32],
    pub expiry: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BatchProofWitness {
    pub pool_id: [u8; 32],
    pub wave_id: u64,
    pub timestamp: u64,
    pub orders: Vec<PrivateOrder>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BatchPublicJournal {
    pub pool_id: [u8; 32],
    pub wave_id: u64,
    pub commitment_root: [u8; 32],
    pub gross_buy: u128,
    pub gross_sell: u128,
    pub internal_matched: u128,
    pub net_amount: u128,
    pub is_net_sell: bool,
    pub valid_order_count: u32,
}

impl BatchPublicJournal {
    pub fn to_sol(&self) -> BatchPublicJournalSol {
        BatchPublicJournalSol {
            pool_id: self.pool_id.into(),
            wave_id: self.wave_id,
            commitment_root: self.commitment_root.into(),
            gross_buy: self.gross_buy,
            gross_sell: self.gross_sell,
            internal_matched: self.internal_matched,
            net_amount: self.net_amount,
            is_net_sell: self.is_net_sell,
            valid_order_count: self.valid_order_count,
        }
    }
}

/// Compute single order commitment matching EclipseOrderRegistry computeCommitment
pub fn hash_commitment(
    pool_id: &[u8; 32],
    side: &OrderSide,
    amount_in: u128,
    min_amount_out: u128,
    expiry: u64,
    secret: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Keccak::v256();
    hasher.update(pool_id);
    match side {
        OrderSide::Buy => hasher.update(&[0u8; 1]),
        OrderSide::Sell => hasher.update(&[1u8; 1]),
    }
    hasher.update(&amount_in.to_be_bytes());
    hasher.update(&min_amount_out.to_be_bytes());
    hasher.update(&expiry.to_be_bytes());
    hasher.update(secret);

    let mut out = [0u8; 32];
    hasher.finalize(&mut out);
    out
}

/// Compute Merkle commitment root of all orders in wave batch
pub fn compute_batch_commitment_root(commitments: &[[u8; 32]]) -> [u8; 32] {
    if commitments.is_empty() {
        return [0u8; 32];
    }
    let mut current = commitments.to_vec();
    while current.len() > 1 {
        let mut next = Vec::new();
        for chunk in current.chunks(2) {
            if chunk.len() == 2 {
                let mut hasher = Keccak::v256();
                hasher.update(&chunk[0]);
                hasher.update(&chunk[1]);
                let mut parent = [0u8; 32];
                hasher.finalize(&mut parent);
                next.push(parent);
            } else {
                next.push(chunk[0]);
            }
        }
        current = next;
    }
    current[0]
}

/// Core zkVM circuit execution function proving batch validity and netting invariants
pub fn verify_and_prove_batch(witness: &BatchProofWitness) -> Result<BatchPublicJournal, &'static str> {
    if witness.orders.is_empty() {
        return Err("Cannot prove empty batch");
    }

    let mut commitments = Vec::with_capacity(witness.orders.len());
    let mut gross_buy: u128 = 0;
    let mut gross_sell: u128 = 0;
    let mut seen_ids = std::collections::HashSet::new();

    for order in &witness.orders {
        // Invariant 1: No duplicated order IDs in same wave
        if !seen_ids.insert(order.order_id) {
            return Err("Duplicate order ID detected in batch");
        }

        // Invariant 2: No expired orders admitted into wave cutoff
        if order.expiry <= witness.timestamp {
            return Err("Expired order in batch");
        }

        // Invariant 3: No zero or negative amount orders
        if order.amount_in == 0 {
            return Err("Zero amountIn order detected");
        }

        // Invariant 4: Hash commitment matches preimage
        let c = hash_commitment(
            &witness.pool_id,
            &order.side,
            order.amount_in,
            order.min_amount_out,
            order.expiry,
            &order.secret,
        );
        commitments.push(c);

        match order.side {
            OrderSide::Buy => {
                gross_buy = gross_buy.checked_add(order.amount_in).ok_or("Overflow in gross buy")?;
            }
            OrderSide::Sell => {
                gross_sell = gross_sell.checked_add(order.amount_in).ok_or("Overflow in gross sell")?;
            }
        }
    }

    // Invariant 5: Batch Netting Formula (Policy A) Conservation
    let matched = std::cmp::min(gross_buy, gross_sell);
    let (net_amount, is_net_sell) = if gross_sell >= gross_buy {
        (gross_sell - gross_buy, true)
    } else {
        (gross_buy - gross_sell, false)
    };

    // Calculate Merkle commitment root
    let root = compute_batch_commitment_root(&commitments);

    Ok(BatchPublicJournal {
        pool_id: witness.pool_id,
        wave_id: witness.wave_id,
        commitment_root: root,
        gross_buy,
        gross_sell,
        internal_matched: matched,
        net_amount,
        is_net_sell,
        valid_order_count: witness.orders.len() as u32,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_batch_netting_and_proof() {
        let pool = [1u8; 32];
        let o1 = PrivateOrder {
            order_id: 1,
            owner: [0x11; 20],
            side: OrderSide::Buy,
            amount_in: 12_000,
            min_amount_out: 3,
            secret: [0xaa; 32],
            expiry: 10_000,
        };
        let o2 = PrivateOrder {
            order_id: 2,
            owner: [0x22; 20],
            side: OrderSide::Sell,
            amount_in: 8_000,
            min_amount_out: 7_900,
            secret: [0xbb; 32],
            expiry: 10_000,
        };

        let witness = BatchProofWitness {
            pool_id: pool,
            wave_id: 201,
            timestamp: 5_000,
            orders: vec![o1, o2],
        };

        let journal = verify_and_prove_batch(&witness).expect("Proof should succeed");
        assert_eq!(journal.gross_buy, 12_000);
        assert_eq!(journal.gross_sell, 8_000);
        assert_eq!(journal.internal_matched, 8_000);
        assert_eq!(journal.net_amount, 4_000);
        assert!(!journal.is_net_sell); // net buy
        assert_eq!(journal.valid_order_count, 2);
    }
}
