use sp1_sdk::{include_elf, Elf, HashableKey, Prover, ProverClient};

const BATCH_PROGRAM_ELF: Elf = include_elf!("eclipse-batch-program");

fn main() {
    let client = ProverClient::from_env();
    let (_, vk) = client.setup(BATCH_PROGRAM_ELF).expect("Failed to setup ELF");
    println!("Program Verification Key Hash: {}", vk.bytes32());
}
