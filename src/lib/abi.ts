// Auto-generated from KopiLoyalty.sol — keep in sync with contract
export const KOPILOYALTY_ABI = [
  // ── Errors ──────────────────────────────────────────────────────────────────
  { type: "error", name: "Unauthorized",        inputs: [] },
  { type: "error", name: "InsufficientBacking", inputs: [] },
  { type: "error", name: "InsufficientPoints",  inputs: [] },
  { type: "error", name: "InvalidAmount",       inputs: [] },
  { type: "error", name: "CafeNotFound",        inputs: [] },
  { type: "error", name: "VoucherNotFound",     inputs: [] },
  { type: "error", name: "CafeStillActive",     inputs: [] },
  { type: "error", name: "TransferFailed",      inputs: [] },

  // ── Events ───────────────────────────────────────────────────────────────────
  {
    type: "event", name: "CafeRegistered",
    inputs: [
      { name: "cafeId",        type: "uint256", indexed: true },
      { name: "owner",         type: "address", indexed: true },
      { name: "pointsTokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event", name: "Deposited",
    inputs: [
      { name: "cafeId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "PointsMinted",
    inputs: [
      { name: "cafeId", type: "uint256", indexed: true },
      { name: "to",     type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "PointsRedeemed",
    inputs: [
      { name: "cafeId", type: "uint256", indexed: true },
      { name: "by",     type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "VoucherTypeCreated",
    inputs: [
      { name: "voucherTokenId", type: "uint256", indexed: true },
      { name: "cafeId",         type: "uint256", indexed: true },
      { name: "pointCost",      type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "VoucherPurchased",
    inputs: [
      { name: "voucherTokenId", type: "uint256", indexed: true },
      { name: "buyer",          type: "address", indexed: true },
      { name: "qty",            type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "VoucherRedeemed",
    inputs: [
      { name: "voucherTokenId", type: "uint256", indexed: true },
      { name: "by",             type: "address", indexed: true },
    ],
  },
  {
    type: "event", name: "RefundClaimed",
    inputs: [
      { name: "cafeId",       type: "uint256", indexed: true },
      { name: "customer",     type: "address", indexed: true },
      { name: "pointsBurned", type: "uint256", indexed: false },
      { name: "monRefunded",  type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "BadgeMinted",
    inputs: [
      { name: "cafeId",     type: "uint256", indexed: true },
      { name: "to",         type: "address", indexed: true },
      { name: "tier",       type: "uint8",   indexed: true },
      { name: "visitCount", type: "uint32",  indexed: false },
    ],
  },

  // ── Write functions ──────────────────────────────────────────────────────────
  {
    type: "function", name: "registerCafe",
    stateMutability: "payable",
    inputs: [],
    outputs: [
      { name: "cafeId",    type: "uint256" },
      { name: "ptTokenId", type: "uint256" },
    ],
  },
  {
    type: "function", name: "deposit",
    stateMutability: "payable",
    inputs: [{ name: "cafeId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function", name: "mintPoints",
    stateMutability: "nonpayable",
    inputs: [
      { name: "cafeId", type: "uint256" },
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function", name: "redeemPoints",
    stateMutability: "nonpayable",
    inputs: [
      { name: "cafeId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function", name: "createVoucherType",
    stateMutability: "nonpayable",
    inputs: [
      { name: "cafeId",    type: "uint256" },
      { name: "pointCost", type: "uint128" },
      { name: "supply",    type: "uint256" },
    ],
    outputs: [{ name: "voucherTokenId", type: "uint256" }],
  },
  {
    type: "function", name: "buyVoucher",
    stateMutability: "nonpayable",
    inputs: [
      { name: "voucherTokenId", type: "uint256" },
      { name: "qty",            type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function", name: "redeemVoucher",
    stateMutability: "nonpayable",
    inputs: [{ name: "voucherTokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function", name: "claimRefund",
    stateMutability: "nonpayable",
    inputs: [{ name: "cafeId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function", name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from",   type: "address" },
      { name: "to",     type: "address" },
      { name: "id",     type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data",   type: "bytes"   },
    ],
    outputs: [],
  },

  // ── Read functions ───────────────────────────────────────────────────────────
  {
    type: "function", name: "getCafe",
    stateMutability: "view",
    inputs: [{ name: "cafeId", type: "uint256" }],
    outputs: [
      { name: "owner",              type: "address" },
      { name: "depositAmount",      type: "uint96"  },
      { name: "pointsTokenId",      type: "uint256" },
      { name: "mintedPoints",       type: "uint256" },
      { name: "circulatingPoints",  type: "uint256" },
      { name: "lastActivity",       type: "uint40"  },
    ],
  },
  {
    type: "function", name: "getMintablePoints",
    stateMutability: "view",
    inputs:  [{ name: "cafeId", type: "uint256" }],
    outputs: [{ name: "remaining", type: "uint256" }],
  },
  {
    type: "function", name: "isRefundClaimable",
    stateMutability: "view",
    inputs:  [{ name: "cafeId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function", name: "getBadgeTokenId",
    stateMutability: "pure",
    inputs: [
      { name: "cafeId", type: "uint256" },
      { name: "tier",   type: "uint8"   },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id",      type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "balanceOfBatch",
    stateMutability: "view",
    inputs: [
      { name: "accounts", type: "address[]" },
      { name: "ids",      type: "uint256[]" },
    ],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function", name: "visitCounts",
    stateMutability: "view",
    inputs: [
      { name: "cafeId",   type: "uint256" },
      { name: "customer", type: "address" },
    ],
    outputs: [{ name: "", type: "uint32" }],
  },
  {
    type: "function", name: "claimedBadges",
    stateMutability: "view",
    inputs: [
      { name: "cafeId",   type: "uint256" },
      { name: "customer", type: "address" },
    ],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function", name: "uri",
    stateMutability: "pure",
    inputs:  [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },

  // ── Constants ────────────────────────────────────────────────────────────────
  { type: "function", name: "POINTS_PER_MON",      stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "INACTIVITY_THRESHOLD", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "BADGE_BRONZE",          stateMutability: "view", inputs: [], outputs: [{ type: "uint8"   }] },
  { type: "function", name: "BADGE_SILVER",          stateMutability: "view", inputs: [], outputs: [{ type: "uint8"   }] },
  { type: "function", name: "BADGE_GOLD",            stateMutability: "view", inputs: [], outputs: [{ type: "uint8"   }] },
  { type: "function", name: "VISITS_BRONZE",         stateMutability: "view", inputs: [], outputs: [{ type: "uint32"  }] },
  { type: "function", name: "VISITS_SILVER",         stateMutability: "view", inputs: [], outputs: [{ type: "uint32"  }] },
  { type: "function", name: "VISITS_GOLD",           stateMutability: "view", inputs: [], outputs: [{ type: "uint32"  }] },
] as const;
