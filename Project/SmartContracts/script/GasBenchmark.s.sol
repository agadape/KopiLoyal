// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {KopiLoyalty} from "../src/KopiLoyalty.sol";

/**
 * @notice Gas benchmark for KopiLoyalty deployed on Monad Testnet.
 *         Each operation is a separate broadcast so forge reports gas per tx.
 *         Run: forge script script/GasBenchmark.s.sol --rpc-url monad_testnet --broadcast
 */
contract GasBenchmark is Script {
    KopiLoyalty constant kopi =
        KopiLoyalty(payable(0x3e1F1dfc9d96304DF67a7DB468E00ac26a00bBF7));

    address constant CUSTOMER1 = address(0xc0fFEE00000000000000000000000000000C0001);

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("=== KopiLoyalty Gas Benchmark - Monad Testnet ===");
        console.log("Wallet  :", deployer);
        console.log("Contract:", address(kopi));
        console.log("--------------------------------------------------");

        // 1. registerCafe — buat cafe baru dengan 1 MON deposit
        //    cap = 1 MON x 10000 = 10000 poin kapasitas
        console.log("[1] registerCafe + 1 MON deposit");
        vm.broadcast(deployerKey);
        (uint256 cafeId, uint256 ptTokenId) = kopi.registerCafe{value: 1 ether}();
        console.log("    cafeId =", cafeId, "| ptTokenId =", ptTokenId);

        // 2. deposit — tambah 0.5 MON deposit
        console.log("[2] deposit + 0.5 MON");
        vm.broadcast(deployerKey);
        kopi.deposit{value: 0.5 ether}(cafeId);

        // 3. mintPoints — no badge (kunjungan 1)
        console.log("[3] mintPoints 50 poin ke deployer (kunjungan 1, no badge)");
        vm.broadcast(deployerKey);
        kopi.mintPoints(cafeId, deployer, 50);

        // 4. mintPoints — trigger Bronze badge (kunjungan 10)
        //    Kirim 9x lagi ke deployer untuk reach kunjungan ke-10
        console.log("[4] mintPoints x9 (kunjungan 2-9, no badge)");
        for (uint256 i = 0; i < 8; i++) {
            vm.broadcast(deployerKey);
            kopi.mintPoints(cafeId, deployer, 10);
        }
        console.log("[5] mintPoints (kunjungan ke-10 = Bronze badge trigger!)");
        vm.broadcast(deployerKey);
        kopi.mintPoints(cafeId, deployer, 10);

        // 6. createVoucherType — 100 poin per voucher
        console.log("[6] createVoucherType 100 poin per voucher");
        vm.broadcast(deployerKey);
        uint256 voucherTokenId = kopi.createVoucherType(cafeId, 100, 0);
        console.log("    voucherTokenId =", voucherTokenId);

        // 7. buyVoucher — deployer punya >100 poin sekarang
        console.log("[7] buyVoucher 1x (burn 100 poin, dapat 1 voucher)");
        vm.broadcast(deployerKey);
        kopi.buyVoucher(voucherTokenId, 1);

        // 8. redeemVoucher — pakai voucher
        console.log("[8] redeemVoucher (burn 1 voucher)");
        vm.broadcast(deployerKey);
        kopi.redeemVoucher(voucherTokenId);

        // 9. redeemPoints — burn poin langsung (deployer masih punya sisa ~50 poin)
        console.log("[9] redeemPoints 30 poin (burn langsung)");
        vm.broadcast(deployerKey);
        kopi.redeemPoints(cafeId, 30);

        // 10. transferCafeOwnership — initiate two-step transfer
        console.log("[10] transferCafeOwnership ke CUSTOMER1");
        vm.broadcast(deployerKey);
        kopi.transferCafeOwnership(cafeId, CUSTOMER1);

        // View functions — gratis, tidak butuh tx
        console.log("--------------------------------------------------");
        uint256 remaining = kopi.getMintablePoints(cafeId);
        console.log("[VIEW] getMintablePoints:", remaining, "poin tersisa");

        bool claimable = kopi.isRefundClaimable(cafeId);
        console.log("[VIEW] isRefundClaimable:", claimable, "(false = cafe masih aktif, benar)");

        (,uint96 dep, , , uint256 circulating,) = kopi.getCafe(cafeId);
        console.log("[VIEW] getCafe deposit:", dep, "wei |  circulating:", circulating);

        console.log("--------------------------------------------------");
        console.log("SELESAI. Lihat kolom gas tiap tx di output di atas.");
    }
}
