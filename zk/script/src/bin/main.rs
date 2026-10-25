//! SP1 Host Script for Eclipse Protocol Batch Prover
//!
//! Generates and verifies real cryptographic zkVM execution proofs for a batch of private orders.
//!
//! Usage:
//! ```shell
//! cargo run --release --bin prove_batch -- --execute
//! cargo run --release --bin prove_batch -- --prove
//! ```

use alloy_sol_types::SolType;
use clap::Parser;
use eclipse_zk_lib::{
    BatchProofWitness, BatchPublicJournalSol, OrderSide, PrivateOrder,
};
use sp1_sdk::{
    blocking::{Prover, ProverClient},
    include_elf, Elf, SP1Stdin,
};

/// The ELF file for the Eclipse Batch Netting SP1 zkVM guest.
const BATCH_PROGRAM_ELF: Elf = include_elf!("eclipse-batch-program");

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Execute the guest program in zkVM CPU emulator and print journal
    #[arg(long)]
    execute: bool,

    /// Generate real cryptographic zkVM STARK/SNARK proof
    #[arg(long)]
    prove: bool,

    /// Path to optional witness JSON file; if omitted, runs on sample wave witness
    #[arg(long)]
    witness: Option<String>,
}

fn main() {
    sp1_sdk::utils::setup_logger();
    dotenv::dotenv().ok();

    let args = Args::parse();

    if args.execute == args.prove {
        eprintln!("Error: Specify exactly one of --execute or --prove");
        std::process::exit(1);
    }

    // Prepare witness: from file or sample testnet batch
    let witness: BatchProofWitness = if let Some(path) = args.witness {
        let content = std::fs::read_to_string(&path).expect("Failed to read witness JSON file");
        serde_json::from_str(&content).expect("Failed to parse witness JSON")
    } else {
        BatchProofWitness {
            pool_id: [0x42; 32],
            wave_id: 219,
            timestamp: 1729860000,
            orders: vec![
                PrivateOrder {
                    order_id: 1001,
                    owner: [0x11; 20],
                    side: OrderSide::Buy,
                    amount_in: 120_000,
                    min_amount_out: 38,
                    secret: [0xaa; 32],
                    expiry: 1729863600,
                },
                PrivateOrder {
                    order_id: 1002,
                    owner: [0x22; 20],
                    side: OrderSide::Sell,
                    amount_in: 95_000,
                    min_amount_out: 94_000,
                    secret: [0xbb; 32],
                    expiry: 1729863600,
                },
                PrivateOrder {
                    order_id: 1003,
                    owner: [0x33; 20],
                    side: OrderSide::Buy,
                    amount_in: 25_000,
                    min_amount_out: 8,
                    secret: [0xcc; 32],
                    expiry: 1729863600,
                },
            ],
        }
    };

    println!("=== Eclipse SP1 zkVM Host Prover ===");
    println!("Target Wave ID: {}", witness.wave_id);
    println!("Orders in Batch: {}", witness.orders.len());

    // Setup Prover Client (SP1)
    let client = ProverClient::from_env();

    // Serialize private witness into zkVM stdin
    let mut stdin = SP1Stdin::new();
    stdin.write(&witness);

    if args.execute {
        println!("[zkVM] Simulating execution in RISC-V environment...");
        let (output, report) = client.execute(BATCH_PROGRAM_ELF, stdin).run().expect("Execution failed");
        println!("[zkVM] Program executed successfully inside SP1!");

        let journal = BatchPublicJournalSol::abi_decode(output.as_slice(), true)
            .expect("Failed to decode committed public values");

        println!("Public Journal Output:");
        println!("  Pool ID: 0x{}", hex::encode(journal.pool_id));
        println!("  Wave ID: {}", journal.wave_id);
        println!("  Commitment Root: 0x{}", hex::encode(journal.commitment_root));
        println!("  Gross Buy: {}", journal.gross_buy);
        println!("  Gross Sell: {}", journal.gross_sell);
        println!("  Internal Matched: {}", journal.internal_matched);
        println!("  Net Leftover: {}", journal.net_amount);
        println!("  Is Net Sell: {}", journal.is_net_sell);
        println!("  Valid Orders: {}", journal.valid_order_count);
        println!("Execution Cycles: {}", report.total_instruction_count());
    } else {
        println!("[zkVM] Compiling proving key & verifier setup...");
        let pk = client.setup(BATCH_PROGRAM_ELF).expect("Failed to setup ELF proving key");

        println!("[zkVM] Generating cryptographic proof (STARK/SNARK)...");
        let proof = client
            .prove(&pk, stdin)
            .run()
            .expect("Failed to generate SP1 zkVM proof");

        println!("Successfully generated SP1 zkVM Proof!");

        println!("[zkVM] Verifying cryptographic proof...");
        client
            .verify(&proof, pk.verifying_key(), None)
            .expect("Failed to verify proof against verifying key");

        println!("Proof Cryptographically Verified against Verification Key!");

        // Save proof artifact
        let proof_path = format!("proof_wave_{}.bin", witness.wave_id);
        if let Ok(bytes) = bincode_serialize(&proof) {
            let _ = std::fs::write(&proof_path, bytes);
            println!("Saved proof to {}", proof_path);
        }
    }
}

fn bincode_serialize<T: serde::Serialize>(val: &T) -> Result<Vec<u8>, ()> {
    serde_json::to_vec(val).map_err(|_| ())
}
