// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SpecterEclipseAdapter} from "../src/SpecterEclipseAdapter.sol";
import {EclipseOrderRegistry} from "../src/EclipseOrderRegistry.sol";
import {EclipsePrivateSettlement} from "../src/EclipsePrivateSettlement.sol";
import {PoolId} from "v4-core/types/PoolId.sol";

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function approve(address spender, uint256 amt) external returns (bool) {
        allowance[msg.sender][spender] = amt;
        return true;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        require(balanceOf[msg.sender] >= amt, "bal");
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        require(balanceOf[from] >= amt, "bal");
        require(allowance[from][msg.sender] >= amt, "allow");
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
        return true;
    }
}

contract SpecterEclipseAdapterTest is Test {
    SpecterEclipseAdapter internal adapter;
    EclipseOrderRegistry internal registry;
    EclipsePrivateSettlement internal settlement;
    MockERC20 internal token;

    address internal specterShieldedVault = address(0x59EC);
    address internal stealthRecipient = address(0x57EA);

    function setUp() public {
        registry = new EclipseOrderRegistry(address(this));
        settlement = new EclipsePrivateSettlement();
        adapter = new SpecterEclipseAdapter(address(registry), address(settlement));
        token = new MockERC20();

        token.mint(specterShieldedVault, 50_000 ether);
    }

    function test_routeShieldedIntent_escrowsIntoEclipse() public {
        vm.startPrank(specterShieldedVault);
        token.approve(address(adapter), 10_000 ether);

        bytes32 commitment = keccak256("specter-private-commitment");
        uint64 expiry = uint64(block.timestamp + 3600);

        uint256 orderId = adapter.routeShieldedIntent(
            bytes32(uint256(1)),
            address(token),
            10_000 ether,
            commitment,
            expiry
        );

        assertEq(orderId, 1, "first order id should be 1");
        assertEq(token.balanceOf(address(registry)), 10_000 ether, "tokens should be escrowed in EclipseOrderRegistry");
        vm.stopPrank();
    }
}
