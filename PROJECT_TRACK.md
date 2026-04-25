# KopiLoyal Monitoring Baseline

Last reviewed: 2026-04-25

## Current State

- Project is a Next.js 15 frontend scaffold for KopiLoyalty on Monad Testnet.
- Main implemented routes:
  - `src/app/page.tsx`
  - `src/app/payment/page.tsx`
- Navigation links to `history` and `profile`, but those pages do not exist yet.
- Contract integration is still placeholder-driven:
  - `src/lib/contract.ts` uses zero address
  - `DEFAULT_CAFE_ID` is hardcoded to `1n`
  - home balance reads token id `1n` directly instead of using cafe data
- Supabase client and types exist, but no real data fetching path is wired into the UI.
- Local build has not been validated because dependencies are not installed in this directory yet.

## What Counts As "On Track"

- The app must run locally with `npm install` + `npm run build`.
- No route in visible navigation should 404.
- No on-chain call should depend on placeholder addresses or guessed token ids.
- Customer-facing balances, cafes, vouchers, and history should come from real on-chain and/or indexed data, not hardcoded arrays.
- Payment flow must match actual operator/customer roles from the smart contract.

## Current Risks

## 1. False integration progress

- UI suggests live wallet + loyalty functionality, but the contract address is still unset.
- Home page reads `balanceOf(address, 1n)` regardless of actual `pointsTokenId`.

## 2. Role mismatch in payment flow

- `src/app/payment/page.tsx` calls `mintPoints` from the connected wallet.
- Based on the guide, minting should be performed by the cafe/operator wallet, not an arbitrary customer wallet.

## 3. Broken navigation

- Bottom nav exposes `/history` and `/profile`, but those routes are missing.

## 4. Placeholder data hides missing backend work

- Nearby cafes and recent transactions are hardcoded in `src/app/page.tsx`.
- Supabase is declared but not used for cafe metadata or transaction history.

## 5. Runtime readiness is unknown

- `next` is unavailable because dependencies are not installed locally.
- There is no `.git` repo in this directory, so change tracking and regression monitoring are weaker than they should be.

## Next Milestones

## M1. Make the project runnable

- Install dependencies
- Confirm `npm run build` passes
- Add `.gitignore` and initialize git if this directory is meant to be the working repo

## M2. Remove placeholder contract assumptions

- Set real `KOPILOYALTY_ADDRESS`
- Replace hardcoded token id reads with a cafe-aware lookup
- Stop using a global default cafe where dynamic selection is required

## M3. Make navigation honest

- Either implement `/history` and `/profile`, or remove those links until ready

## M4. Wire real data

- Fetch cafe metadata from Supabase
- Fetch history from indexed events / Supabase
- Replace fake balances and transactions in the UI

## M5. Correct transaction authority

- Separate customer actions from cashier/cafe-owner actions
- Validate every contract write against the ABI and intended caller role

## Review Checklist For Future Changes

- Does this change remove placeholders, or add more placeholders?
- Does it reduce hardcoded cafe-specific assumptions?
- Does every visible route exist?
- Does every contract call use a real address and correct token id?
- Does the acting wallet match the required smart contract role?
- Can the app still build after the change?
