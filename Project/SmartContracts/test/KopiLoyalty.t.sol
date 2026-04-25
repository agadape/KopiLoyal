// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {KopiLoyalty} from "../src/KopiLoyalty.sol";

contract KopiLoyaltyTest is Test {
    KopiLoyalty kopi;

    address owner     = makeAddr("owner");
    address customer1 = makeAddr("customer1");
    address customer2 = makeAddr("customer2");
    address friend    = makeAddr("friend");

    uint256 cafeId;
    uint256 ptTokenId;

    function setUp() public {
        kopi = new KopiLoyalty();

        vm.deal(owner, 10 ether);
        vm.prank(owner);
        // 1 MON deposit → 10_000 points capacity
        (cafeId, ptTokenId) = kopi.registerCafe{value: 1 ether}();
    }

    // =========================================================================
    // Registration & Deposit
    // =========================================================================

    function test_RegisterCafe() public view {
        (address o, uint96 dep, uint256 ptId, uint256 minted, uint256 circ,) = kopi.getCafe(cafeId);
        assertEq(o,      owner);
        assertEq(dep,    1 ether);
        assertEq(ptId,   ptTokenId);
        assertEq(minted, 0);
        assertEq(circ,   0);
    }

    function test_Deposit() public {
        vm.prank(owner);
        kopi.deposit{value: 0.5 ether}(cafeId);
        (, uint96 dep,,,,) = kopi.getCafe(cafeId);
        assertEq(dep, 1.5 ether);
    }

    function test_Deposit_UpdatesLastActivity() public {
        uint256 later = block.timestamp + 1 hours;
        vm.warp(later);
        vm.prank(owner);
        kopi.deposit{value: 0.1 ether}(cafeId);
        (,,,,, uint40 la) = kopi.getCafe(cafeId);
        // forge-lint: disable-next-line(unsafe-typecast)
        assertEq(la, uint40(later));
    }

    function test_Deposit_ZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(KopiLoyalty.InvalidAmount.selector);
        kopi.deposit{value: 0}(cafeId);
    }

    // =========================================================================
    // Points
    // =========================================================================

    function test_MintPoints() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 100);
        assertEq(kopi.balanceOf(customer1, ptTokenId), 100);
    }

    function test_MintPoints_UpdatesCirculating() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 300);
        (,,,, uint256 circ,) = kopi.getCafe(cafeId);
        assertEq(circ, 300);
    }

    function test_MintPoints_ExceedsCap_Reverts() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 10_000);

        vm.prank(owner);
        vm.expectRevert(KopiLoyalty.InsufficientBacking.selector);
        kopi.mintPoints(cafeId, customer1, 1);
    }

    function test_MintPoints_CapRestoredAfterRedeem() public {
        // Fill cap, redeem all, then should be able to mint again
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 10_000);

        vm.prank(customer1);
        kopi.redeemPoints(cafeId, 10_000);

        // circulatingPoints is now 0 → cap fully restored
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 10_000); // should not revert
        assertEq(kopi.balanceOf(customer1, ptTokenId), 10_000);
    }

    function test_RedeemPoints_DecreasesCirculating() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 500);

        vm.prank(customer1);
        kopi.redeemPoints(cafeId, 200);

        assertEq(kopi.balanceOf(customer1, ptTokenId), 300);
        (,,,, uint256 circ,) = kopi.getCafe(cafeId);
        assertEq(circ, 300);
    }

    function test_ParallelMint() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 35);

        vm.prank(owner);
        kopi.mintPoints(cafeId, customer2, 42);

        assertEq(kopi.balanceOf(customer1, ptTokenId), 35);
        assertEq(kopi.balanceOf(customer2, ptTokenId), 42);
    }

    // =========================================================================
    // Vouchers
    // =========================================================================

    function test_CreateAndBuyVoucher() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 1_000);

        vm.prank(owner);
        uint256 voucherId = kopi.createVoucherType(cafeId, 1_000, 0);

        vm.prank(customer1);
        kopi.buyVoucher(voucherId, 1);

        assertEq(kopi.balanceOf(customer1, ptTokenId), 0);
        assertEq(kopi.balanceOf(customer1, voucherId), 1);
    }

    function test_BuyVoucher_DecreasesCirculating() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 1_000);
        vm.prank(owner);
        uint256 voucherId = kopi.createVoucherType(cafeId, 1_000, 0);

        vm.prank(customer1);
        kopi.buyVoucher(voucherId, 1);

        (,,,, uint256 circ,) = kopi.getCafe(cafeId);
        assertEq(circ, 0);
    }

    function test_BuyVoucher_RestoresCapacity() public {
        // buying a voucher (burning points) should restore minting capacity
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 10_000);
        vm.prank(owner);
        uint256 voucherId = kopi.createVoucherType(cafeId, 10_000, 0);

        vm.prank(customer1);
        kopi.buyVoucher(voucherId, 1); // burns 10_000 points

        // cap should be fully restored
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer2, 10_000); // should not revert
        assertEq(kopi.balanceOf(customer2, ptTokenId), 10_000);
    }

    function test_GiftVoucher() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 1_000);
        vm.prank(owner);
        uint256 voucherId = kopi.createVoucherType(cafeId, 1_000, 0);

        vm.prank(customer1);
        kopi.buyVoucher(voucherId, 1);

        // Gift to friend
        vm.prank(customer1);
        kopi.safeTransferFrom(customer1, friend, voucherId, 1, "");

        assertEq(kopi.balanceOf(customer1, voucherId), 0);
        assertEq(kopi.balanceOf(friend, voucherId),    1);

        vm.prank(friend);
        kopi.redeemVoucher(voucherId);

        assertEq(kopi.balanceOf(friend, voucherId), 0);
    }

    // =========================================================================
    // Refund Guarantee
    // =========================================================================

    function test_ClaimRefund_AfterInactivity() public {
        // Mint 1_000 points to customer1 (circulating = 1_000, deposit = 1 MON)
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 1_000);

        // Warp 91 days past last activity
        vm.warp(block.timestamp + 91 days);

        uint256 balanceBefore = customer1.balance;

        vm.prank(customer1);
        kopi.claimRefund(cafeId);

        // Expected refund = (1e18 * 1_000) / 1_000 = 1e18 = 1 MON (all circulating is customer1's)
        uint256 expectedRefund = 1 ether;
        assertEq(customer1.balance - balanceBefore, expectedRefund);
        assertEq(kopi.balanceOf(customer1, ptTokenId), 0);
    }

    function test_ClaimRefund_Proportional_MultipleCustomers() public {
        // customer1: 300 pts, customer2: 700 pts → total 1_000 pts, deposit 1 MON
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 300);
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer2, 700);

        vm.warp(block.timestamp + 91 days);

        uint256 c1Before = customer1.balance;
        uint256 c2Before = customer2.balance;

        vm.prank(customer1);
        kopi.claimRefund(cafeId);

        vm.prank(customer2);
        kopi.claimRefund(cafeId);

        // customer1 gets 30% = 0.3 MON, customer2 gets 70% = 0.7 MON
        assertApproxEqAbs(customer1.balance - c1Before, 0.3 ether, 1);
        assertApproxEqAbs(customer2.balance - c2Before, 0.7 ether, 1);
        assertEq(kopi.balanceOf(customer1, ptTokenId), 0);
        assertEq(kopi.balanceOf(customer2, ptTokenId), 0);
    }

    function test_ClaimRefund_BeforeInactivity_Reverts() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 500);

        // Only 30 days, not 90
        vm.warp(block.timestamp + 30 days);

        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.CafeStillActive.selector);
        kopi.claimRefund(cafeId);
    }

    function test_ClaimRefund_ActivityResetsTimer() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 500);

        // Advance 80 days, then owner makes a deposit
        vm.warp(block.timestamp + 80 days);
        vm.prank(owner);
        kopi.deposit{value: 0.1 ether}(cafeId);

        // Now at 80 days past deposit, still < 90 days
        vm.warp(block.timestamp + 80 days);

        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.CafeStillActive.selector);
        kopi.claimRefund(cafeId);
    }

    function test_IsRefundClaimable() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 100);

        assertFalse(kopi.isRefundClaimable(cafeId));

        vm.warp(block.timestamp + 91 days);
        assertTrue(kopi.isRefundClaimable(cafeId));
    }

    function test_ClaimRefund_NoPoints_Reverts() public {
        vm.warp(block.timestamp + 91 days);

        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.InvalidAmount.selector);
        kopi.claimRefund(cafeId);
    }

    function test_ClaimRefund_DustPoints_BurnedWithoutTransfer() public {
        // Edge case: if deposit is tiny relative to circulating, refund rounds to 0
        // Points should still be burned (F-08) so ownerWithdraw is not permanently blocked

        // Register a cafe with tiny deposit so 1 point = 0 wei refund
        address owner2 = makeAddr("owner2");
        vm.deal(owner2, 1 ether);
        vm.prank(owner2);
        // 1 wei deposit, capacity = 0 (1 * 10000 / 1e18 = 0) — cannot mint
        // Use 0.1 ether (1000 points cap) but then we'll manipulate for dust
        (uint256 cafe2, uint256 pt2) = kopi.registerCafe{value: 1 ether}();

        vm.prank(owner2);
        kopi.mintPoints(cafe2, customer1, 1_000);
        vm.prank(owner2);
        kopi.mintPoints(cafe2, customer2, 9_000); // customer2 holds 9000/10000

        // customer1 redeems their 1000 points, leaving customer2 with 9000
        // Now customer2 claims refund at 91 days — gets 9000/9000 of remaining deposit
        // customer1 is left with 0 points, so can't claim
        vm.warp(block.timestamp + 91 days);

        uint256 balBefore = customer2.balance;
        vm.prank(customer2);
        kopi.claimRefund(cafe2);

        // customer2 got their share, balance of pt2 is 0
        assertEq(kopi.balanceOf(customer2, pt2), 0);
        assertGt(customer2.balance, balBefore);
    }

    // =========================================================================
    // Owner Withdraw
    // =========================================================================

    function test_OwnerWithdraw_NoCirculating() public {
        // No points minted — owner can withdraw full deposit immediately
        uint256 balBefore = owner.balance;

        vm.prank(owner);
        kopi.ownerWithdraw(cafeId);

        assertEq(owner.balance - balBefore, 1 ether);
        (, uint96 dep,,,,) = kopi.getCafe(cafeId);
        assertEq(dep, 0);
    }

    function test_OwnerWithdraw_AfterAllPointsRedeemed() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 500);

        vm.prank(customer1);
        kopi.redeemPoints(cafeId, 500);

        uint256 balBefore = owner.balance;
        vm.prank(owner);
        kopi.ownerWithdraw(cafeId);

        assertEq(owner.balance - balBefore, 1 ether);
    }

    function test_OwnerWithdraw_WithCirculating_Reverts() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 100);

        vm.prank(owner);
        vm.expectRevert(KopiLoyalty.InvalidAmount.selector);
        kopi.ownerWithdraw(cafeId);
    }

    function test_OwnerWithdraw_NotOwner_Reverts() public {
        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.Unauthorized.selector);
        kopi.ownerWithdraw(cafeId);
    }

    function test_OwnerWithdraw_ZeroDeposit_Reverts() public {
        vm.prank(owner);
        kopi.ownerWithdraw(cafeId);

        vm.prank(owner);
        vm.expectRevert(KopiLoyalty.InvalidAmount.selector);
        kopi.ownerWithdraw(cafeId);
    }

    // =========================================================================
    // Ownership Transfer
    // =========================================================================

    function test_TransferCafeOwnership() public {
        address newOwner = makeAddr("newOwner");

        vm.prank(owner);
        kopi.transferCafeOwnership(cafeId, newOwner);

        vm.prank(newOwner);
        kopi.acceptCafeOwnership(cafeId);

        (address currentOwner,,,,,) = kopi.getCafe(cafeId);
        assertEq(currentOwner, newOwner);

        // Old owner can no longer mint
        vm.prank(owner);
        vm.expectRevert(KopiLoyalty.Unauthorized.selector);
        kopi.mintPoints(cafeId, customer1, 1);

        // New owner can mint
        vm.prank(newOwner);
        kopi.mintPoints(cafeId, customer1, 1);
    }

    function test_TransferCafeOwnership_NotOwner_Reverts() public {
        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.Unauthorized.selector);
        kopi.transferCafeOwnership(cafeId, customer1);
    }

    function test_AcceptCafeOwnership_NotPending_Reverts() public {
        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.Unauthorized.selector);
        kopi.acceptCafeOwnership(cafeId);
    }

    function test_TransferCafeOwnership_ZeroAddress_Reverts() public {
        vm.prank(owner);
        vm.expectRevert(KopiLoyalty.InvalidAmount.selector);
        kopi.transferCafeOwnership(cafeId, address(0));
    }

    // =========================================================================
    // Badges
    // =========================================================================

    function _mintVisits(address customer, uint256 n) internal {
        for (uint256 i; i < n; ++i) {
            vm.prank(owner);
            kopi.mintPoints(cafeId, customer, 1);
        }
    }

    function test_Badge_Bronze_At10Visits() public {
        uint256 bronzeId = kopi.getBadgeTokenId(cafeId, kopi.BADGE_BRONZE());
        assertEq(kopi.balanceOf(customer1, bronzeId), 0);

        _mintVisits(customer1, 10);

        assertEq(kopi.balanceOf(customer1, bronzeId), 1);
        assertEq(kopi.visitCounts(cafeId, customer1), 10);
    }

    function test_Badge_Silver_At50Visits() public {
        uint256 silverId = kopi.getBadgeTokenId(cafeId, kopi.BADGE_SILVER());
        _mintVisits(customer1, 50);
        assertEq(kopi.balanceOf(customer1, silverId), 1);
    }

    function test_Badge_Gold_At100Visits() public {
        uint256 goldId = kopi.getBadgeTokenId(cafeId, kopi.BADGE_GOLD());
        _mintVisits(customer1, 100);
        assertEq(kopi.balanceOf(customer1, goldId), 1);
    }

    function test_Badge_AllThreeTiersAccumulate() public {
        uint256 bronzeId = kopi.getBadgeTokenId(cafeId, kopi.BADGE_BRONZE());
        uint256 silverId = kopi.getBadgeTokenId(cafeId, kopi.BADGE_SILVER());
        uint256 goldId   = kopi.getBadgeTokenId(cafeId, kopi.BADGE_GOLD());

        _mintVisits(customer1, 100);

        // All three badges minted exactly once
        assertEq(kopi.balanceOf(customer1, bronzeId), 1);
        assertEq(kopi.balanceOf(customer1, silverId), 1);
        assertEq(kopi.balanceOf(customer1, goldId),   1);
    }

    function test_Badge_NoDuplicate_AfterExtraVisits() public {
        uint256 bronzeId = kopi.getBadgeTokenId(cafeId, kopi.BADGE_BRONZE());

        _mintVisits(customer1, 20); // 2x past bronze threshold

        // Still only 1 bronze badge
        assertEq(kopi.balanceOf(customer1, bronzeId), 1);
        assertEq(kopi.claimedBadges(cafeId, customer1) & 1, 1);
    }

    function test_Badge_IndependentPerCafe() public {
        // Register a second cafe
        address owner2 = makeAddr("owner2");
        vm.deal(owner2, 2 ether);
        vm.prank(owner2);
        (uint256 cafeId2, uint256 ptTokenId2) = kopi.registerCafe{value: 1 ether}();
        assertNotEq(ptTokenId2, ptTokenId);

        uint256 bronzeId1 = kopi.getBadgeTokenId(cafeId,  kopi.BADGE_BRONZE());
        uint256 bronzeId2 = kopi.getBadgeTokenId(cafeId2, kopi.BADGE_BRONZE());
        assertNotEq(bronzeId1, bronzeId2); // different cafes → different badge IDs

        _mintVisits(customer1, 10);

        assertEq(kopi.balanceOf(customer1, bronzeId1), 1);
        assertEq(kopi.balanceOf(customer1, bronzeId2), 0); // not earned at cafe2
    }

    function test_Badge_IsTransferableByDefault() public {
        _mintVisits(customer1, 10);
        uint256 bronzeId = kopi.getBadgeTokenId(cafeId, kopi.BADGE_BRONZE());

        // Badge is an ERC1155 token — transferable (soulbound enforcement is opt-in)
        vm.prank(customer1);
        kopi.safeTransferFrom(customer1, friend, bronzeId, 1, "");

        assertEq(kopi.balanceOf(customer1, bronzeId), 0);
        assertEq(kopi.balanceOf(friend, bronzeId),    1);
    }

    // =========================================================================
    // Access Control
    // =========================================================================

    function test_MintPoints_NotOwner_Reverts() public {
        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.Unauthorized.selector);
        kopi.mintPoints(cafeId, customer1, 100);
    }

    function test_RedeemVoucher_NoBalance_Reverts() public {
        vm.prank(owner);
        uint256 voucherId = kopi.createVoucherType(cafeId, 100, 0);

        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.InvalidAmount.selector);
        kopi.redeemVoucher(voucherId);
    }

    function test_RedeemVoucher_InvalidType_Reverts() public {
        vm.prank(customer1);
        vm.expectRevert(KopiLoyalty.VoucherNotFound.selector);
        kopi.redeemVoucher(999); // non-existent voucher type
    }

    // =========================================================================
    // Fuzz Tests — property-based edge case coverage
    // =========================================================================

    /// Any valid mint amount (1..cap) must succeed and match circulatingPoints
    function testFuzz_MintPoints_ValidAmount(uint256 amount) public {
        uint256 cap = 10_000; // 1 ether * POINTS_PER_MON / 1e18
        amount = bound(amount, 1, cap);

        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, amount);

        assertEq(kopi.balanceOf(customer1, ptTokenId), amount);
        (,,,, uint256 circ,) = kopi.getCafe(cafeId);
        assertEq(circ, amount);
        assertLe(circ, cap);
    }

    /// Minting above cap must always revert regardless of exact amount
    function testFuzz_MintPoints_AboveCap_AlwaysReverts(uint256 excess) public {
        excess = bound(excess, 1, type(uint128).max);
        uint256 cap = 10_000;

        vm.prank(owner);
        vm.expectRevert(KopiLoyalty.InsufficientBacking.selector);
        kopi.mintPoints(cafeId, customer1, cap + excess);
    }

    /// Large qty in buyVoucher must revert (not silently overflow) — verifies F-05 fix
    function testFuzz_BuyVoucher_LargeQtyReverts(uint256 qty) public {
        // pointCost = 1_000; any qty where 1_000 * qty overflows uint256 must revert
        // overflow point: qty > type(uint256).max / 1_000 ≈ 1.157e74
        qty = bound(qty, type(uint256).max / 1_000 + 1, type(uint256).max);

        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 1_000);
        vm.prank(owner);
        uint256 voucherId = kopi.createVoucherType(cafeId, 1_000, 0);

        vm.prank(customer1);
        vm.expectRevert(); // Solidity 0.8 arithmetic overflow panic
        kopi.buyVoucher(voucherId, qty);
    }

    /// claimRefund proportional math — refund never exceeds deposit
    function testFuzz_ClaimRefund_RefundNeverExceedsDeposit(uint256 points) public {
        points = bound(points, 1, 10_000);

        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, points);

        vm.warp(block.timestamp + 91 days);

        (, uint96 depositBefore,,,,) = kopi.getCafe(cafeId);
        uint256 ethBefore = customer1.balance;

        vm.prank(customer1);
        kopi.claimRefund(cafeId);

        uint256 refunded = customer1.balance - ethBefore;
        assertLe(refunded, uint256(depositBefore)); // refund ≤ total deposit
        assertEq(kopi.balanceOf(customer1, ptTokenId), 0); // points fully burned
    }

    /// deposit within safe range (no uint96 overflow) must accumulate correctly
    function testFuzz_Deposit_AccumulatesCorrectly(uint96 extra) public {
        // Cafe already has 1 ether deposit; bound extra so total stays within uint96
        uint96 maxExtra = type(uint96).max - uint96(1 ether);
        extra = uint96(bound(uint256(extra), 1, uint256(maxExtra)));

        vm.deal(owner, uint256(extra) + 10 ether);
        vm.prank(owner);
        kopi.deposit{value: extra}(cafeId);

        (, uint96 dep,,,,) = kopi.getCafe(cafeId);
        assertEq(dep, uint96(1 ether) + extra);
    }

    /// deposit that would overflow uint96 must always revert (confirms F-06 fix)
    function testFuzz_Deposit_OverflowReverts(uint96 extra) public {
        // Any extra that pushes total past uint96.max must revert
        uint96 minOverflow = type(uint96).max - uint96(1 ether) + 1;
        extra = uint96(bound(uint256(extra), uint256(minOverflow), uint256(type(uint96).max)));

        vm.deal(owner, uint256(extra) + 10 ether);
        vm.prank(owner);
        vm.expectRevert(); // Solidity 0.8 uint96 overflow panic
        kopi.deposit{value: extra}(cafeId);
    }

    /// visitCounts must never decrease and saturates at uint32.max
    function testFuzz_VisitCount_Saturates(uint32 visits) public {
        visits = uint32(bound(uint256(visits), 1, 200)); // keep test fast

        // Need enough deposit to cover all mints
        vm.prank(owner);
        kopi.deposit{value: 1 ether}(cafeId); // total 2 ether = 20_000 cap

        for (uint256 i; i < visits; ++i) {
            vm.prank(owner);
            kopi.mintPoints(cafeId, customer1, 1);
        }

        uint32 counted = kopi.visitCounts(cafeId, customer1);
        assertEq(counted, visits);
        assertLe(counted, type(uint32).max);
    }

    // =========================================================================
    // Gas Snapshots
    // =========================================================================

    function test_Gas_MintPoints_NoVisitBadge() public {
        uint256 g = gasleft();
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 35);
        emit log_named_uint("mintPoints (no badge) gas", g - gasleft());
    }

    function test_Gas_MintPoints_TriggersBronzeBadge() public {
        _mintVisits(customer1, 9); // 9 visits, no badge yet
        uint256 g = gasleft();
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 1); // 10th visit → bronze minted
        emit log_named_uint("mintPoints (bronze badge) gas", g - gasleft());
    }

    function test_Gas_ClaimRefund() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 500);
        vm.warp(block.timestamp + 91 days);

        uint256 g = gasleft();
        vm.prank(customer1);
        kopi.claimRefund(cafeId);
        emit log_named_uint("claimRefund gas", g - gasleft());
    }

    function test_Gas_RedeemVoucher() public {
        vm.prank(owner);
        kopi.mintPoints(cafeId, customer1, 1_000);
        vm.prank(owner);
        uint256 voucherId = kopi.createVoucherType(cafeId, 1_000, 0);
        vm.prank(customer1);
        kopi.buyVoucher(voucherId, 1);

        uint256 g = gasleft();
        vm.prank(customer1);
        kopi.redeemVoucher(voucherId);
        emit log_named_uint("redeemVoucher gas", g - gasleft());
    }
}
