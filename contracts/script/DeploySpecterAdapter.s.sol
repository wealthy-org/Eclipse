// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpecterEclipseAdapter} from "../src/SpecterEclipseAdapter.sol";

contract DeploySpecterAdapter is Script {
    function run() external returns (address adapterAddress) {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address registry = 0xA697AD15EB193c7e23c4208606587c2FEfDf92ad;
        address settlement = 0xAe07dB429A0902fB7f505a296E12C254A468eA74;

        console.log("Deploying SpecterEclipseAdapter with deployer:", deployer);

        vm.startBroadcast();
        SpecterEclipseAdapter adapter = new SpecterEclipseAdapter(registry, settlement);
        vm.stopBroadcast();

        adapterAddress = address(adapter);
        console.log("SpecterEclipseAdapter deployed at:", adapterAddress);
    }
}
