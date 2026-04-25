# KopiLoyalty ☕

> **Web3 loyalty infrastructure for local cafes — built on Monad.**  
> Points live in your wallet, vouchers are transferable NFTs, and if a cafe shuts down your funds come back. Automatically.

**Monad Blitz Hackathon · April 2026**

---

## The Problem

Every coffee loyalty app today stores your points in *their* database. They can expire them, delete them, or just close down and take them with them. You have zero ownership over something you earned.

KopiLoyalty fixes that.

---

## What Makes It Different

| | Web2 Loyalty (GoPay, Starbucks) | KopiLoyalty |
|---|---|---|
| Where are my points? | Company's database | Your wallet (ERC-1155) |
| Can they expire? | Yes, anytime | Never |
| Can I gift a voucher? | No (or very restricted) | Yes — free, no permission needed |
| If the cafe closes? | Points gone | `claimRefund()` → get MON back |
| Is the treasury transparent? | No | Anyone can verify on-chain |
| Proof of loyalty? | Number in a DB | NFT badge, permanent on-chain |

---

## Core Features

### Customer
- **Earn Points** — minted to your wallet after every purchase
- **Redeem Points** — burn points for in-store discounts
- **Buy Vouchers** — exchange points for ERC-1155 voucher tokens
- **Gift Vouchers** — transfer any voucher to a friend's wallet (`safeTransferFrom` — no platform approval needed)
- **Loyalty Badges** — Bronze (10 visits), Silver (50), Gold (100) — NFTs, auto-minted on-chain
- **Claim Refund** — if a cafe goes dark for 90+ days, get your proportional MON back automatically

### Cafe Owner
- **Register Cafe** — deposit MON as backing for points (`1 MON = 10,000 point capacity`)
- **Mint Points** — issue points to customers after payment
- **Create Vouchers** — define voucher types with point costs
- **Withdraw** — reclaim deposit once all outstanding points are redeemed
- **Transparent Treasury** — anyone can verify `depositAmount` and `circulatingPoints` on-chain

---

## Tech Stack

**Smart Contract**
- Solidity `^0.8.24` · Foundry
- [Solady](https://github.com/Vectorized/solady) ERC1155 + ReentrancyGuard
- Single contract handles all cafes — no per-cafe deployments
- Deployed on Monad Testnet

**Frontend**
- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- wagmi v2 · viem · RainbowKit
- Mobile-first PWA-style layout (`max-w-sm` centered shell)

---

## Project Structure

```
MonadBlitz/
├── Frontend/               ← Next.js app (Dex & Dave)
│   ├── src/
│   │   ├── app/            ← App Router pages
│   │   │   └── customer/   ← Home · History · Scan · Rewards · Profile
│   │   ├── components/
│   │   │   ├── screens/    ← Full-page screen components
│   │   │   ├── ui/         ← BadgeCard · TxRow · Toast
│   │   │   └── layout/     ← TabBar
│   │   ├── hooks/
│   │   │   └── useKopiLoyalty.ts   ← all blockchain reads/writes
│   │   ├── lib/
│   │   │   ├── contract.ts ← ABI + address + BADGE_TIERS constants
│   │   │   ├── errors.ts   ← parseContractError (Indonesian messages)
│   │   │   └── utils.ts    ← fmtIDR · shortAddr · formatPoints
│   │   └── config/
│   │       └── index.ts    ← wagmi + RainbowKit config (monadTestnet)
│   └── README.md           ← Frontend-specific run guide
│
├── SmartContracts/
│   ├── src/KopiLoyalty.sol ← Main contract (single file, ~470 lines)
│   ├── test/KopiLoyalty.t.sol ← 51 unit + fuzz tests
│   ├── script/
│   │   ├── Deploy.s.sol       ← Deployment script
│   │   └── GasBenchmark.s.sol ← On-chain gas benchmark (all functions)
│   └── foundry.toml
│
├── Docs/
│   └── WhyBlockchain_WA.md ← Full frontend dev spec + Web3 rationale per flow
│
└── README.md               ← This file
```

---

## Getting Started — Frontend

```bash
cd Frontend
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # from cloud.walletconnect.com (free)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3e1F1dfc9d96304DF67a7DB468E00ac26a00bBF7
NEXT_PUBLIC_CAFE_ID=1
```

```bash
npm run dev
# → http://localhost:3000
```

> MetaMask injected works without a WalletConnect Project ID.

---

## Getting Started — Smart Contract

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Build & Test

```bash
cd SmartContracts
forge install          # install Solady dependencies
forge build            # compile
forge test             # run all 51 tests
forge test -vv         # verbose with logs
forge test --gas-report  # gas usage table per function
```

### Deploy to Monad Testnet

```bash
# Set your private key (PowerShell)
$env:PRIVATE_KEY = "0x<your-private-key>"

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $env:PRIVATE_KEY \
  --broadcast
```

### Run Gas Benchmark (on-chain)

```bash
forge script script/GasBenchmark.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $env:PRIVATE_KEY \
  --broadcast
```

---

## Deployed Contract

| | |
|---|---|
| **Contract Address** | [`0x3e1F1dfc9d96304DF67a7DB468E00ac26a00bBF7`](https://testnet.monadvision.com/address/0x3e1F1dfc9d96304DF67a7DB468E00ac26a00bBF7) |
| **Deploy TX** | [`0x4345dfb...b4091`](https://testnet.monadvision.com/tx/0x4345dfb345ae987ba634e70d12a02d1726d3045d3784f0721a34fe582b6b4091) |
| **Block** | 27,665,629 |
| **Deploy Gas** | 3,548,858 |
| **Network** | Monad Testnet (Chain ID: 10143) |

---

## Contract Architecture

### Token ID Scheme

All token types (points, vouchers, badges) share one ERC1155 contract. IDs are assigned globally:

| Token Type | ID Assignment | Example |
|---|---|---|
| **Loyalty Points** | Sequential counter — one per cafe registration | Cafe #1 → tokenId `1` |
| **Voucher Types** | Sequential counter — one per voucher type created | 1st voucher → tokenId `2` |
| **Badges** | Deterministic: `keccak256("KL_BADGE", cafeId, tier)` | Bronze Cafe#1 → `0x3f2a...` |

Badge IDs use `keccak256` so they can never collide with the sequential counter (~256-bit range vs sequential integers).

Off-chain computation (JS):
```ts
import { keccak256, encodePacked } from 'viem'
const bronzeId = keccak256(encodePacked(
  ['bytes32', 'uint256', 'uint8'],
  [toBytes('KL_BADGE', { size: 32 }), cafeId, 0]
))
```

### Economic Model

```
mintingCap = deposit (wei) × 10,000 / 1e18

Example: 1 MON deposit → 10,000 points capacity
         2 MON deposit → 20,000 points capacity
```

`circulatingPoints` tracks live outstanding supply. Cap enforcement prevents minting more points than the deposit can back — inflation is **mathematically impossible**.

Refund formula when a cafe goes inactive (90+ days):
```
refund = cafeDeposit × customerBalance / totalCirculating
```

### Badge Tiers

| Badge | Visit Threshold | Token | Transferable |
|---|---|---|---|
| Bronze | 10 visits | ERC1155 NFT | Yes |
| Silver | 50 visits | ERC1155 NFT | Yes |
| Gold | 100 visits | ERC1155 NFT | Yes |

Badges are auto-minted during `mintPoints` — no separate claim tx required. Each tier mints exactly once per `(cafe, customer)` pair via a bitmask.

---

## Key Functions

### Owner Functions

| Function | Description | Gas (Monad Testnet) |
|---|---|---|
| `registerCafe()` | Register cafe, optional MON deposit | ~221,507 |
| `deposit(cafeId)` | Add MON to expand minting capacity | ~73,279 |
| `mintPoints(cafeId, to, amount)` | Issue points to a customer (1 visit counted) | ~144,099–213,036 |
| `createVoucherType(cafeId, pointCost, supply)` | Define new voucher type | ~125,234 |
| `ownerWithdraw(cafeId)` | Reclaim deposit when circulatingPoints = 0 | ~36,510 |
| `transferCafeOwnership(cafeId, newOwner)` | Initiate two-step ownership transfer | ~76,732 |
| `acceptCafeOwnership(cafeId)` | Complete ownership transfer (called by new owner) | ~26,330 |

### Customer Functions

| Function | Description | Gas (Monad Testnet) |
|---|---|---|
| `buyVoucher(voucherTokenId, qty)` | Burn points to receive voucher token(s) | ~143,072 |
| `redeemVoucher(voucherTokenId)` | Burn 1 voucher at the cafe | ~76,255 |
| `redeemPoints(cafeId, amount)` | Burn points for direct in-store discount | ~91,317 |
| `claimRefund(cafeId)` | Claim proportional MON refund after 90-day inactivity | ~47,216 |
| `safeTransferFrom(...)` | Gift a voucher to any wallet (standard ERC1155) | ~50,946 |

### View Functions (free, no gas)

| Function | Returns |
|---|---|
| `getCafe(cafeId)` | owner, deposit, pointsTokenId, mintedPoints, circulatingPoints, lastActivity |
| `getMintablePoints(cafeId)` | Remaining mintable points under current cap |
| `isRefundClaimable(cafeId)` | `true` if 90-day inactivity window is open |
| `getBadgeTokenId(cafeId, tier)` | Deterministic badge tokenId (computable off-chain) |
| `balanceOf(address, tokenId)` | Standard ERC1155 balance |

---

## Events Emitted

All on-chain activity is fully observable. Every state-changing operation emits an indexed event — usable for frontend subscriptions, activity feeds, and off-chain indexers.

| Event | Emitted When | Key Parameters |
|---|---|---|
| `CafeRegistered` | New cafe registered | `cafeId`, `owner`, `pointsTokenId` |
| `Deposited` | MON deposited to cafe | `cafeId`, `amount` |
| `PointsMinted` | Points issued to customer | `cafeId`, `to`, `amount` |
| `PointsRedeemed` | Points burned for discount | `cafeId`, `by`, `amount` |
| `BadgeMinted` | Loyalty badge awarded | `cafeId`, `to`, `tier`, `visitCount` |
| `VoucherTypeCreated` | New voucher type defined | `voucherTokenId`, `cafeId`, `pointCost` |
| `VoucherPurchased` | Customer bought voucher(s) | `voucherTokenId`, `buyer`, `qty` |
| `VoucherRedeemed` | Voucher burned at cafe | `voucherTokenId`, `by` |
| `RefundClaimed` | Customer claimed refund | `cafeId`, `customer`, `pointsBurned`, `monRefunded` |
| `OwnerWithdrew` | Owner reclaimed deposit | `cafeId`, `amount` |
| `CafeOwnershipTransferred` | Ownership transfer completed | `cafeId`, `from`, `to` |

**For frontend activity log:** Each tx hash is available from the wallet provider after confirmation. Link format:
```
https://testnet.monadvision.com/tx/{txHash}
```

---

## Custom Errors

All reverts use Solidity custom errors (not `require` strings) — more gas-efficient and fully typed on the frontend via viem's `ContractFunctionRevertedError`.

| Error | When It Reverts |
|---|---|
| `Unauthorized` | Caller is not the cafe owner |
| `InsufficientBacking` | Minting would exceed deposit-backed cap |
| `InsufficientPoints` | Customer balance < required burn amount |
| `InvalidAmount` | Zero amount, uint96 overflow, or other invalid input |
| `CafeNotFound` | `cafeId` was never registered |
| `VoucherNotFound` | `voucherTokenId` was never created |
| `CafeStillActive` | Inactivity < 90 days, refund window not open |
| `TransferFailed` | MON `.call` returned false (reverting recipient) |

---

## Security Model

### Reentrancy Protection
- All write functions use Solady's `nonReentrant` modifier
- `getCafe`, `getMintablePoints`, `isRefundClaimable` use `nonReadReentrant` to prevent read-only reentrancy (Solady-specific, not available in OpenZeppelin)
- **CEI pattern** (Checks-Effects-Interactions) enforced throughout — all state changes happen before any external `_mint` or `.call`

### Economic Safety
- **Deposit-backed cap**: `circulatingPoints + amount ≤ (deposit × 10,000) / 1e18` — hardcoded, enforced on every `mintPoints`
- **No free minting**: Only the registered `cafe.owner` can mint points for their cafe
- **Customer priority**: `ownerWithdraw` reverts if `circulatingPoints != 0` — customers can always redeem before owner takes funds
- **Refund math**: `(deposit × customerBalance) / totalCirculating` always ≤ deposit by definition

### Input Validation
- `msg.value > type(uint96).max` → reverts (prevents deposit overflow)
- `qty` overflow in `buyVoucher`: Solidity 0.8 checked arithmetic catches `pointCost × qty` overflow before any state change
- Two-step ownership transfer — prevents accidental transfer to wrong address
- Zero address rejected in ownership transfer
- `receive()` reverts — no accidental MON sent directly to contract

### Inactivity Guarantee
- `lastActivity` resets on: `mintPoints`, `deposit`, `createVoucherType`, `ownerWithdraw`
- 90-day silence required before refund window opens — prevents dust-deposit griefing attacks
- Visit counter saturates at `uint32.max` — cannot wrap around to re-trigger badges

---

## Why Monad

KopiLoyalty is specifically designed around Monad's architecture:

| Monad Feature | How KopiLoyalty Uses It |
|---|---|
| **~1s finality** | Scan QR → points appear in wallet near-instantly. No "pending" UX. |
| **Parallel execution** | Multiple cafes can `mintPoints` simultaneously with no throughput bottleneck |
| **High block gas limit (200M)** | Badge logic (2× `_mint`) fits comfortably in a single tx |
| **Low gas cost** | `mintPoints` at ~144k gas makes per-customer loyalty economically viable |
| **EVM-compatible** | No contract changes vs Ethereum — drop-in deploy, zero migration cost |

On Ethereum mainnet, `mintPoints` at 144,099 gas × current base fee (~15 gwei) ≈ $0.07 per customer visit — borderline viable. On Monad at ~105 gwei and sub-cent MON prices, cost is negligible.

**Monad-specific cold storage note:** First-ever call per (cafe, customer) pair costs more (~210k gas) because storage slots are cold. Subsequent calls on the same pair warm up to ~144k gas. The benchmark captures both cases.

---

## Unit Tests

**51 tests · 0 failed** (`forge test`)

| Category | Tests | What's Covered |
|---|---|---|
| Registration & Deposit | 4 | `registerCafe`, `deposit`, activity clock reset, zero-deposit revert |
| Points | 6 | mint, cap enforcement, cap restored after redeem, parallel multi-customer mint |
| Vouchers | 5 | create, buy, gift (`safeTransferFrom`), redeem, capacity restored after buy |
| Refund Guarantee | 6 | full refund, proportional multi-customer, before-inactivity revert, activity resets timer, `isRefundClaimable`, no-points revert |
| Owner Withdraw | 5 | withdraw with no circulating, after all redeemed, revert with circulating, unauthorized, zero deposit |
| Ownership Transfer | 4 | full two-step flow, not owner, not pending, zero address |
| Badges | 6 | Bronze@10, Silver@50, Gold@100, all three accumulate, no duplicate, independent per cafe |
| Access Control | 3 | unauthorized mint, redeem-no-balance, invalid voucher |
| **Fuzz Tests** | **7** | valid mint range, above-cap always reverts, large-qty overflow, refund never exceeds deposit, deposit accumulation, deposit overflow, visit count saturation |
| Gas Snapshots | 4 | `mintPoints` no badge, `mintPoints` badge trigger, `claimRefund`, `redeemVoucher` |

```bash
forge test             # run all 51 tests
forge test --match-test testFuzz  # fuzz only (256 runs each by default)
forge test --gas-report           # gas table per function
```

---

## Gas Benchmark — Monad Testnet

All 17 transactions executed on Monad Testnet in a single script run.  
Gas price: **105 gwei** · Total cost: **0.2502 MON**

| # | Operation | Gas Used | Cost (MON) | TX Hash |
|---|---|---|---|---|
| 1 | `registerCafe` + 1 MON deposit | 221,507 | 0.02326 | [0xdb4b...e84a](https://testnet.monadvision.com/tx/0xdb4b7515f12ebd6b4688d9e895ba10b35733ffaa5f3c5ac7973a5b55285ce84a) |
| 2 | `deposit` + 0.5 MON | 73,279 | 0.00769 | [0x1318...17b](https://testnet.monadvision.com/tx/0x13181f4be637bfff40ff77ae28071f0d318445b5728cef1ea8ff140ca64c717b) |
| 3 | `mintPoints` 50 pts (visit 1, cold) | 210,003 | 0.02205 | [0xb3c1...09e3f](https://testnet.monadvision.com/tx/0xb3c19292ebf5d28e4e55621007789a3b204e10fb40667ba40ccf1b7f0dc09e3f) |
| 4–11 | `mintPoints` 10 pts ×8 (visits 2–9) | 144,099 each | 0.01513 each | — |
| 12 | `mintPoints` (visit 10 → **Bronze badge**) | 213,036 | 0.02237 | [0xf657...ca71](https://testnet.monadvision.com/tx/0xf657c64615c2093ac8155e94c4c44a207eb26a1698be516b1227657e1252ca71) |
| 13 | `createVoucherType` 100 pts | 125,234 | 0.01315 | [0x2b93...7cfc](https://testnet.monadvision.com/tx/0x2b9308611cb81d5daacf6c9c6daf38a571e5f988589ed8094fff8fd1fefc7cfc) |
| 14 | `buyVoucher` 1× | 143,072 | 0.01502 | [0x473f...7812](https://testnet.monadvision.com/tx/0x473f0948d59cd0cdb5a798f758cffa26faf3425e6179bca3f42398ccfcf7b812) |
| 15 | `redeemVoucher` | 76,255 | 0.00801 | [0x64ff...fdde](https://testnet.monadvision.com/tx/0x64ffb6381c32aaaf5a5a26dea8ca17dfb8d36cbc4654a6f736ce58900d6ffdde) |
| 16 | `redeemPoints` 30 pts | 91,317 | 0.00959 | [0x8d76...708f](https://testnet.monadvision.com/tx/0x8d7610f546e6d1ecdecbbc9fa33dbc759aba5b53fe277efd1624b12c9955708f) |
| 17 | `transferCafeOwnership` | 76,732 | 0.00806 | [0x3034...313c5](https://testnet.monadvision.com/tx/0x303439cebd4b0738eb0b18f15e85ff4ccab39c5279b598ff9a871f73236313c5) |

> **Note on cold vs warm storage (Monad-specific):** Visit #1 costs 210k gas (cold SLOAD = 8,100 gas on Monad vs 2,100 on Ethereum). Visits 2–9 cost 144k gas (warm, already-touched slots). Badge trigger adds ~69k gas for the second `_mint` call.

---

## Contract Verification

Source code verification on Monad Testnet explorer allows judges and users to read the contract directly on-chain without downloading the repo.

```bash
# Verify on Monad Testnet (Sourcify-compatible)
forge verify-contract \
  0x3e1F1dfc9d96304DF67a7DB468E00ac26a00bBF7 \
  src/KopiLoyalty.sol:KopiLoyalty \
  --chain-id 10143 \
  --verifier sourcify \
  --verifier-url https://sourcify.dev/server/
```

Explorer: [testnet.monadvision.com/address/0x3e1F1dfc9d96304DF67a7DB468E00ac26a00bBF7](https://testnet.monadvision.com/address/0x3e1F1dfc9d96304DF67a7DB468E00ac26a00bBF7)

---

## Network

| | |
|---|---|
| Network | Monad Testnet |
| Chain ID | `10143` |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | `https://testnet.monadvision.com` |
| Native Token | MON |
| Block Time | ~500ms |
| Finality | ~1s |

---

## Hackathon Checklist

- [x] Contract deployed on **Monad Testnet**
- [x] Gas benchmark run on-chain (17 txs, 0 failures)
- [x] 51 unit + fuzz tests passing
- [ ] Contract verified on Monad Testnet explorer
- [ ] Contract deployed on **Monad Mainnet** *(required for submission)*
- [ ] Frontend live on **Vercel**
- [ ] Public GitHub repository
- [ ] Real on-chain transaction executed on mainnet
- [ ] `NEXT_PUBLIC_CONTRACT_ADDRESS` filled in production env
- [ ] WalletConnect Project ID set

---

## Team

| | Role |
|---|---|
| **Hans** | Smart Contract · Solidity · Foundry · Monad deployment |
| **Dex** | Frontend · Next.js · wagmi · UI/UX |
| **Dave** | Frontend · Components · Screens |
