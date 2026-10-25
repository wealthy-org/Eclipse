// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EclipseBatchVerifier} from "../src/EclipseBatchVerifier.sol";

contract DeployBatchVerifier is Script {
    function run() external returns (address verifierAddress) {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        console.log("Deploying EclipseBatchVerifier with deployer:", deployer);

        vm.startBroadcast();
        EclipseBatchVerifier verifier = new EclipseBatchVerifier();
        vm.stopBroadcast();

        verifierAddress = address(verifier);
        console.log("EclipseBatchVerifier deployed at:", verifierAddress);
    }
}
