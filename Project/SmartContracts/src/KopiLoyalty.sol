// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "solady/src/tokens/ERC1155.sol";
import {ReentrancyGuard} from "solady/src/utils/ReentrancyGuard.sol";

/**
 * @title KopiLoyalty
 * @notice Loyalty points + voucher system for cafes, built on Monad.
 *
 * Token ID scheme (sequential, global counter):
 *   - Each cafe registration assigns one "points" tokenId
 *   - Each voucher type creation assigns one "voucher" tokenId
 *   - Badge tokenIds are deterministic: keccak256("KL_BADGE", cafeId, tier)
 *     (keccak outputs are ~256-bit values, never reachable by the sequential counter)
 *
 * On-chain:  registrasi cafe, deposit MON, mint/burn points,
 *            create/buy/redeem voucher, refund guarantee, loyalty badges,
 *            owner withdraw, two-step ownership transfer
 * Off-chain (Supabase): nama cafe, lokasi, earn rate (IDR→points), discount metadata
 *
 * Design decision — lastActivity:
 *   Resetting the 90-day inactivity clock on `deposit` and `createVoucherType`
 *   (not only on `mintPoints`) is intentional. Depositing more MON is a legitimate
 *   signal of ongoing cafe operation. A theoretical 1-wei-every-89-days attack
 *   requires continuous gas expenditure with zero economic benefit to the attacker.
 */
contract KopiLoyalty is ERC1155, ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error Unauthorized();
    error InsufficientBacking();
    error InsufficientPoints();
    error InvalidAmount();
    error CafeNotFound();
    error VoucherNotFound();
    error CafeStillActive();
    error TransferFailed();

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    // 1 MON (1e18 wei) = 10_000 points backing capacity
    uint256 public constant POINTS_PER_MON = 10_000;

    // Cafe must be silent for this long before refunds open
    uint256 public constant INACTIVITY_THRESHOLD = 90 days;

    // Badge tiers
    uint8 public constant BADGE_BRONZE = 0;
    uint8 public constant BADGE_SILVER = 1;
    uint8 public constant BADGE_GOLD   = 2;

    // Visit thresholds per badge tier
    uint32 public constant VISITS_BRONZE = 10;
    uint32 public constant VISITS_SILVER = 50;
    uint32 public constant VISITS_GOLD   = 100;

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    // Cafe struct — packed into 4 storage slots:
    // Slot 1: owner (160 bits) + deposit (96 bits)             = 256 bits
    // Slot 2: pointsTokenId (256 bits)                         = 256 bits
    // Slot 3: mintedPoints (216 bits) + lastActivity (40 bits) = 256 bits
    // Slot 4: circulatingPoints (256 bits)                     = 256 bits
    //
    // mintedPoints = all-time historical metric (informational only).
    // circulatingPoints = live outstanding supply used for cap enforcement.
    struct Cafe {
        address owner;
        uint96  deposit;
        uint256 pointsTokenId;
        uint216 mintedPoints;      // historical; never decremented
        uint40  lastActivity;
        uint256 circulatingPoints; // cap enforcement: circulatingPoints + amount <= cap
    }

    // Packed into 1 storage slot: cafeId (128) + pointCost (128)
    struct VoucherType {
        uint128 cafeId;
        uint128 pointCost;
    }

    uint256 private _nextCafeId  = 1;
    uint256 private _nextTokenId = 1;

    mapping(uint256 cafeId  => Cafe)        public cafes;
    mapping(uint256 tokenId => VoucherType) public voucherTypes;

    // visit count per (cafe, customer) — saturating at uint32.max
    mapping(uint256 cafeId => mapping(address customer => uint32)) public visitCounts;

    // claimed badge bitmask per (cafe, customer): bit0=bronze, bit1=silver, bit2=gold
    mapping(uint256 cafeId => mapping(address customer => uint8)) public claimedBadges;

    // two-step ownership transfer (F-14)
    mapping(uint256 cafeId => address) public pendingOwner;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event CafeRegistered(uint256 indexed cafeId, address indexed owner, uint256 indexed pointsTokenId);
    event Deposited(uint256 indexed cafeId, uint256 amount);
    event PointsMinted(uint256 indexed cafeId, address indexed to, uint256 amount);
    event PointsRedeemed(uint256 indexed cafeId, address indexed by, uint256 amount);
    event VoucherTypeCreated(uint256 indexed voucherTokenId, uint256 indexed cafeId, uint256 pointCost);
    event VoucherPurchased(uint256 indexed voucherTokenId, address indexed buyer, uint256 qty);
    event VoucherRedeemed(uint256 indexed voucherTokenId, address indexed by);
    event RefundClaimed(uint256 indexed cafeId, address indexed customer, uint256 pointsBurned, uint256 monRefunded);
    event BadgeMinted(uint256 indexed cafeId, address indexed to, uint8 indexed tier, uint32 visitCount);
    event OwnerWithdrew(uint256 indexed cafeId, uint256 amount);
    event CafeOwnershipTransferred(uint256 indexed cafeId, address indexed from, address indexed to);

    // -------------------------------------------------------------------------
    // Reject accidental MON transfers (F-20)
    // -------------------------------------------------------------------------
    receive() external payable { revert(); }

    // -------------------------------------------------------------------------
    // Cafe Management
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new cafe. msg.value is the initial MON deposit (can be 0).
     * @return cafeId    On-chain ID for this cafe
     * @return ptTokenId ERC1155 tokenId for this cafe's loyalty points
     */
    function registerCafe() external payable nonReentrant returns (uint256 cafeId, uint256 ptTokenId) {
        if (msg.value > type(uint96).max) revert InvalidAmount();
        unchecked {
            cafeId    = _nextCafeId++;
            ptTokenId = _nextTokenId++;
        }

        cafes[cafeId] = Cafe({
            owner:             msg.sender,
            deposit:           uint96(msg.value),
            pointsTokenId:     ptTokenId,
            mintedPoints:      0,
            lastActivity:      uint40(block.timestamp),
            circulatingPoints: 0
        });

        emit CafeRegistered(cafeId, msg.sender, ptTokenId);
        if (msg.value > 0) emit Deposited(cafeId, msg.value);
    }

    /**
     * @notice Add MON deposit to expand minting capacity.
     *         Also resets the inactivity clock (see design decision note above).
     */
    function deposit(uint256 cafeId) external payable nonReentrant {
        if (msg.value == 0 || msg.value > type(uint96).max) revert InvalidAmount();
        Cafe storage cafe = cafes[cafeId];
        if (cafe.owner != msg.sender) revert Unauthorized();

        // Checked addition — Solidity 0.8 reverts on uint96 overflow (F-06)
        cafe.deposit      += uint96(msg.value);
        cafe.lastActivity  = uint40(block.timestamp);

        emit Deposited(cafeId, msg.value);
    }

    // -------------------------------------------------------------------------
    // Points (Loyalty Tokens)
    // -------------------------------------------------------------------------

    /**
     * @notice Cafe owner mints points to a customer after payment.
     *         Amount is calculated off-chain (Supabase earn rate).
     *         Each call counts as one visit for badge purposes.
     *
     * CEI pattern (F-01): ALL state changes happen before any external _mint call.
     * Cap enforcement (F-02): uses circulatingPoints (live supply), not mintedPoints (historical).
     */
    function mintPoints(uint256 cafeId, address to, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        Cafe storage cafe = cafes[cafeId];
        if (cafe.owner != msg.sender) revert Unauthorized();

        // --- CHECKS ---
        // Checked arithmetic — 0.8 reverts on overflow before cap comparison
        uint256 newCirculating = cafe.circulatingPoints + amount;
        uint256 cap = (uint256(cafe.deposit) * POINTS_PER_MON) / 1e18;
        if (newCirculating > cap) revert InsufficientBacking();

        // --- EFFECTS (all state before any external call) ---
        unchecked {
            // forge-lint: disable-next-line(unsafe-typecast)
            cafe.mintedPoints      = uint216(uint256(cafe.mintedPoints) + amount); // historical only
            cafe.circulatingPoints  = newCirculating;
            cafe.lastActivity       = uint40(block.timestamp);
        }

        // Saturating add — prevents uint32 wrap-around re-triggering badges (F-04/H-4)
        uint32 prev = visitCounts[cafeId][to];
        uint32 newVisits = prev < type(uint32).max ? prev + 1 : prev;
        visitCounts[cafeId][to] = newVisits;

        // Update badge bitmask (pure state change — no external call yet)
        (uint8 badgeTier, bool mintBadge) = _tryUpdateBadgeState(cafeId, to, newVisits);

        emit PointsMinted(cafeId, to, amount);
        if (mintBadge) emit BadgeMinted(cafeId, to, badgeTier, newVisits);

        // --- INTERACTIONS (all external calls last) ---
        _mint(to, cafe.pointsTokenId, amount, "");
        if (mintBadge) _mint(to, getBadgeTokenId(cafeId, badgeTier), 1, "");
    }

    /**
     * @notice Customer burns points for a direct discount (no voucher needed).
     *         Discount value resolved off-chain by frontend.
     */
    function redeemPoints(uint256 cafeId, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        Cafe storage cafe = cafes[cafeId];
        if (cafe.pointsTokenId == 0) revert CafeNotFound();

        _burn(msg.sender, cafe.pointsTokenId, amount);

        cafe.circulatingPoints -= amount; // checked: 0.8; safe — _burn reverts if balance < amount

        emit PointsRedeemed(cafeId, msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Vouchers (Giftable via ERC1155 safeTransferFrom)
    // -------------------------------------------------------------------------

    /**
     * @notice Cafe owner creates a voucher type.
     *         Discount description stored off-chain in Supabase.
     * @param cafeId    Cafe this voucher belongs to
     * @param pointCost Points a customer must burn to get one voucher
     * @param supply    Vouchers minted directly to owner wallet (0 = none)
     */
    function createVoucherType(uint256 cafeId, uint128 pointCost, uint256 supply)
        external
        nonReentrant // F-03: guard against ERC1155 callback when supply > 0
        returns (uint256 voucherTokenId)
    {
        Cafe storage cafe = cafes[cafeId];
        if (cafe.owner != msg.sender) revert Unauthorized();
        if (pointCost == 0) revert InvalidAmount();
        if (cafeId > type(uint128).max) revert InvalidAmount(); // F-11: bounds check before cast

        unchecked {
            voucherTokenId    = _nextTokenId++;
            cafe.lastActivity = uint40(block.timestamp);
        }

        // forge-lint: disable-next-line(unsafe-typecast)
        voucherTypes[voucherTokenId] = VoucherType({cafeId: uint128(cafeId), pointCost: pointCost});

        emit VoucherTypeCreated(voucherTokenId, cafeId, pointCost);
        if (supply > 0) _mint(msg.sender, voucherTokenId, supply, "");
    }

    /**
     * @notice Customer burns points to receive voucher token(s).
     *         Vouchers can be gifted via ERC1155 safeTransferFrom.
     */
    function buyVoucher(uint256 voucherTokenId, uint256 qty) external nonReentrant {
        if (qty == 0) revert InvalidAmount();
        VoucherType memory vt = voucherTypes[voucherTokenId];
        if (vt.cafeId == 0) revert VoucherNotFound();

        // Checked multiplication — 0.8 reverts on overflow (F-05: prevents free-voucher exploit)
        uint256 totalCost = uint256(vt.pointCost) * qty;

        Cafe storage cafe = cafes[uint256(vt.cafeId)];
        if (cafe.pointsTokenId == 0) revert CafeNotFound(); // F-10: explicit check

        _burn(msg.sender, cafe.pointsTokenId, totalCost);

        cafe.circulatingPoints -= totalCost; // checked: safe — _burn reverts if balance < totalCost

        _mint(msg.sender, voucherTokenId, qty, "");
        emit VoucherPurchased(voucherTokenId, msg.sender, qty);
    }

    /**
     * @notice Customer redeems one voucher at the cafe (burns it on-chain).
     *         Frontend applies the discount after tx confirms.
     */
    function redeemVoucher(uint256 voucherTokenId) external nonReentrant { // F-04
        if (voucherTypes[voucherTokenId].cafeId == 0) revert VoucherNotFound(); // check type first
        if (balanceOf(msg.sender, voucherTokenId) == 0) revert InvalidAmount(); // user-friendly error
        _burn(msg.sender, voucherTokenId, 1);
        emit VoucherRedeemed(voucherTokenId, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Refund Guarantee
    // -------------------------------------------------------------------------

    /**
     * @notice If a cafe has had zero owner activity for >= 90 days, any customer
     *         holding points can claim a proportional share of the MON deposit.
     *
     *         Refund amount = (customerBalance / totalCirculating) × cafeDeposit
     *
     *         Points are burned regardless of whether the refund rounds to zero (F-08):
     *         dust points are burned to prevent permanent blockage of ownerWithdraw.
     *         CEI pattern prevents reentrancy — state fully updated before ETH transfer.
     */
    function claimRefund(uint256 cafeId) external nonReentrant {
        Cafe storage cafe = cafes[cafeId];
        if (cafe.pointsTokenId == 0) revert CafeNotFound();

        unchecked {
            if (block.timestamp - uint256(cafe.lastActivity) < INACTIVITY_THRESHOLD) {
                revert CafeStillActive();
            }
        }

        uint256 customerBalance = balanceOf(msg.sender, cafe.pointsTokenId);
        if (customerBalance == 0) revert InvalidAmount();

        uint256 totalCirculating = cafe.circulatingPoints;
        if (totalCirculating == 0) revert InvalidAmount();

        // Proportional share — always <= cafe.deposit because customerBalance <= totalCirculating
        uint256 refundAmount = (uint256(cafe.deposit) * customerBalance) / totalCirculating;

        // Effects before interaction (CEI)
        _burn(msg.sender, cafe.pointsTokenId, customerBalance);
        // forge-lint: disable-next-line(unsafe-typecast)
        cafe.deposit           -= uint96(refundAmount); // safe: refundAmount <= deposit
        cafe.circulatingPoints -= customerBalance;       // safe: customerBalance <= totalCirculating

        emit RefundClaimed(cafeId, msg.sender, customerBalance, refundAmount);

        // F-08: burn dust points even when refund rounds to zero — nothing to transfer
        if (refundAmount == 0) return;

        (bool ok,) = msg.sender.call{value: refundAmount}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * @notice Owner reclaims their full deposit once all points have been spent.
     *         Cannot be called while any points remain outstanding — customers have priority.
     */
    function ownerWithdraw(uint256 cafeId) external nonReentrant {
        Cafe storage cafe = cafes[cafeId];
        if (cafe.owner != msg.sender) revert Unauthorized();
        if (cafe.circulatingPoints != 0) revert InvalidAmount();

        uint96 amount = cafe.deposit;
        if (amount == 0) revert InvalidAmount();

        cafe.deposit      = 0;
        cafe.lastActivity = uint40(block.timestamp); // F-13: reset clock on withdrawal
        emit OwnerWithdrew(cafeId, amount);

        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // -------------------------------------------------------------------------
    // Two-step Ownership Transfer (F-14)
    // -------------------------------------------------------------------------

    /**
     * @notice Initiate transfer of cafe ownership to a new address.
     *         The new owner must call acceptCafeOwnership to complete the transfer.
     */
    function transferCafeOwnership(uint256 cafeId, address newOwner) external {
        if (cafes[cafeId].owner != msg.sender) revert Unauthorized();
        if (newOwner == address(0)) revert InvalidAmount();
        pendingOwner[cafeId] = newOwner;
    }

    /**
     * @notice Complete the ownership transfer. Must be called by the pending owner.
     */
    function acceptCafeOwnership(uint256 cafeId) external {
        if (pendingOwner[cafeId] != msg.sender) revert Unauthorized();
        address oldOwner = cafes[cafeId].owner;
        cafes[cafeId].owner = msg.sender;
        delete pendingOwner[cafeId];
        emit CafeOwnershipTransferred(cafeId, oldOwner, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Badge (internal logic)
    // -------------------------------------------------------------------------

    /**
     * @dev Pure state update — updates bitmask and returns (tier, shouldMint).
     *      No external calls here; all _mint calls happen in mintPoints after
     *      all state changes (CEI, F-01).
     */
    function _tryUpdateBadgeState(uint256 cafeId, address to, uint32 visits)
        internal
        returns (uint8 tier, bool shouldMint)
    {
        uint8 claimed = claimedBadges[cafeId][to];

        if (visits >= VISITS_GOLD && (claimed & 4) == 0) {
            claimedBadges[cafeId][to] = claimed | 4;
            return (BADGE_GOLD, true);
        } else if (visits >= VISITS_SILVER && (claimed & 2) == 0) {
            claimedBadges[cafeId][to] = claimed | 2;
            return (BADGE_SILVER, true);
        } else if (visits >= VISITS_BRONZE && (claimed & 1) == 0) {
            claimedBadges[cafeId][to] = claimed | 1;
            return (BADGE_BRONZE, true);
        }
        return (0, false);
    }

    // -------------------------------------------------------------------------
    // View Helpers
    // -------------------------------------------------------------------------

    /**
     * @notice Deterministic badge tokenId — computable off-chain without RPC call.
     *         JS: keccak256(ethers.solidityPacked(["bytes32","uint256","uint8"], [...]))
     *         Namespace separation: keccak256 outputs are ~256-bit values, unreachable
     *         by the sequential _nextTokenId counter.
     */
    function getBadgeTokenId(uint256 cafeId, uint8 tier) public pure returns (uint256) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(keccak256(abi.encodePacked(bytes32("KL_BADGE"), cafeId, tier)));
    }

    function getCafe(uint256 cafeId)
        external
        view
        nonReadReentrant // F-18: prevent read-only reentrancy
        returns (
            address owner,
            uint96  depositAmount,
            uint256 pointsTokenId,
            uint256 mintedPoints,
            uint256 circulatingPoints,
            uint40  lastActivity
        )
    {
        Cafe storage c = cafes[cafeId];
        return (c.owner, c.deposit, c.pointsTokenId, uint256(c.mintedPoints), c.circulatingPoints, c.lastActivity);
    }

    function getMintablePoints(uint256 cafeId) external view nonReadReentrant returns (uint256 remaining) {
        Cafe storage c = cafes[cafeId];
        uint256 cap = (uint256(c.deposit) * POINTS_PER_MON) / 1e18;
        unchecked {
            remaining = cap > c.circulatingPoints ? cap - c.circulatingPoints : 0;
        }
    }

    /** @notice Returns true if the 90-day refund window is open for this cafe. */
    function isRefundClaimable(uint256 cafeId) external view nonReadReentrant returns (bool) {
        Cafe storage c = cafes[cafeId];
        return c.pointsTokenId != 0
            && block.timestamp - uint256(c.lastActivity) >= INACTIVITY_THRESHOLD;
    }

    // -------------------------------------------------------------------------
    // ERC1155 Metadata
    // -------------------------------------------------------------------------

    function uri(uint256 /*id*/) public pure override returns (string memory) {
        return "https://kopiloyalty.app/api/token/{id}";
    }
}
