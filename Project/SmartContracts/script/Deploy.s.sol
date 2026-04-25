// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {KopiLoyalty} from "../src/KopiLoyalty.sol";

contract DeployKopiLoyalty is Script {
    function run() external returns (KopiLoyalty kopi) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deploying KopiLoyalty from:", deployer);
        console.log("Network chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);
        kopi = new KopiLoyalty();
        vm.stopBroadcast();

        console.log("KopiLoyalty deployed at:", address(kopi));
        console.log("POINTS_PER_MON:", kopi.POINTS_PER_MON());
    }
}
