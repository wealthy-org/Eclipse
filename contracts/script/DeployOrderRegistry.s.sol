// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {EclipseOrderRegistry} from "../src/EclipseOrderRegistry.sol";

contract DeployOrderRegistry is Script {
    function run() external returns (EclipseOrderRegistry registry) {
        address owner = vm.envAddress("DEPLOYER_ADDRESS");
        vm.startBroadcast();
        registry = new EclipseOrderRegistry(owner);
        vm.stopBroadcast();
        console2.log("EclipseOrderRegistry deployed at:", address(registry));
    }
}
