//! SP1 zkVM Guest Program for Eclipse Protocol Batch Netting Verification
#![no_main]
sp1_zkvm::entrypoint!(main);

use alloy_sol_types::SolType;
use eclipse_zk_lib::{verify_and_prove_batch, BatchProofWitness, BatchPublicJournalSol};

pub fn main() {
    // 1. Read private witness (order data, preimages, limits) from host prover via zkVM IO
    let witness = sp1_zkvm::io::read::<BatchProofWitness>();

    // 2. Execute deterministic batch validation & value conservation invariants inside zkVM
    let journal = match verify_and_prove_batch(&witness) {
        Ok(j) => j,
        Err(e) => {
            panic!("Batch invariant verification failed: {}", e);
        }
    };

    // 3. ABI-encode public journal into canonical Ethereum format
    let sol_journal = journal.to_sol();
    let bytes = BatchPublicJournalSol::abi_encode(&sol_journal);

    // 4. Commit to the public values (this becomes the verifiable public output of the ZK proof)
    sp1_zkvm::io::commit_slice(&bytes);
}
