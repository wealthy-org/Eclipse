// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockPonsToken} from "../src/MockPonsToken.sol";
import {MockStockToken} from "../src/MockStockToken.sol";
import {EclipseExecutorRoute} from "../src/EclipseExecutorRoute.sol";

contract DeployPhase8And9 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        MockPonsToken pons = new MockPonsToken();
        console2.log("MockPonsToken deployed at:", address(pons));

        MockStockToken nvda = new MockStockToken();
        console2.log("MockStockToken (NVDA) deployed at:", address(nvda));

        EclipseExecutorRoute route = new EclipseExecutorRoute(deployer);
        console2.log("EclipseExecutorRoute deployed at:", address(route));

        vm.stopBroadcast();
    }
}
