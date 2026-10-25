// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EclipsePrivateSettlement} from "../src/EclipsePrivateSettlement.sol";

contract DeployPrivateSettlement is Script {
    function run() external returns (address settlementAddress) {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        console.log("Deploying EclipsePrivateSettlement with deployer:", deployer);

        vm.startBroadcast();
        EclipsePrivateSettlement settlement = new EclipsePrivateSettlement();
        vm.stopBroadcast();

        settlementAddress = address(settlement);
        console.log("EclipsePrivateSettlement deployed at:", settlementAddress);
    }
}
