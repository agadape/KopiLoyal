# KopiLoyalty — WA Pitch + Frontend Dev Guide

Dokumen ini berisi tiga bagian:
1. **[BAGIAN 1]** Pesan WA siap copy-paste untuk jelasin ke tim/teman
2. **[BAGIAN 2]** Panduan lengkap frontend dev (contract endpoints, ABI, error handling)
3. **[BAGIAN 3]** Flow user lengkap + alasan kenapa tiap langkah butuh Web3

---

# BAGIAN 1 — VERSI WHATSAPP (copy-paste)

---

```
*☕ KopiLoyalty — Web3 Loyalty untuk Cafe Lokal*
*Dibangun di Monad | Hackathon Build*

━━━━━━━━━━━━━━━━━━━━━━

*❓ Kenapa blockchain, bukannya Web2 biasa?*

Pertanyaan bagus. Jawabannya ada di 5 hal yang secara
fundamental TIDAK BISA direplikasi Web2:

━━━━━━━━━━━━━━━━━━━━━━

*1️⃣ Poin = Aset Beneran di Wallet Kamu*
Di Web2: poin = angka di database orang lain.
Bisa expired, bisa dihapus, platform bisa tutup.

Di KopiLoyalty: poin hidup di wallet kamu (ERC1155 token).
Cafe tutup, server down, platform mati → poin tetap ada.
Ga ada yang bisa ambil atau hapus.

*2️⃣ Voucher Bisa Di-Gift ke Temen — Tanpa Izin Platform*
Beli voucher "Free Americano" → transfer ke temen →
temen klaim langsung di cafe.
Semua ini terjadi tanpa platform perlu approve.
(Impossible di Web2 tanpa sistem verifikasi kompleks)

*3️⃣ Cross-Cafe Point Swap 🔥*
Punya 500 poin Kopi Senja tapi mau makan di Warmindo?
Swap langsung. Rate-nya transparan, berbasis
berapa MON yang di-lock tiap cafe sebagai backing.
→ Ga butuh GrabFood/OVO sebagai perantara

*4️⃣ Treasury Transparan — Cafe Punya Skin in the Game*
Setiap cafe harus deposit MON sebagai backing poin mereka.
1 MON = kapasitas 10.000 poin.
Siapapun bisa cek on-chain: "cafe ini beneran punya
dana ga untuk honor poin kamu?"
→ Cafe abal-abal langsung ketahuan

*5️⃣ Coalition Merchant Tanpa Perusahaan Pusat*
10 cafe di Malioboro mau bikin loyalty card bareng?
Di Web2: hire developer + percaya 1 pihak + bayar fee.
Di KopiLoyalty: semua register ke smart contract yang sama.
Smart contract yang enforce aturannya — ga ada yang bisa curang.

━━━━━━━━━━━━━━━━━━━━━━

*✅ Fitur yang SUDAH ADA di Smart Contract:*

🏪 *registerCafe()* — Cafe owner daftar + deposit MON
💰 *deposit()* — Tambah modal backing kapanpun
🪙 *mintPoints()* — Kasir mint poin ke customer setelah bayar
🔥 *redeemPoints()* — Customer burn poin untuk diskon
🎫 *createVoucherType()* — Cafe buat tipe voucher (harga dalam poin)
🛒 *buyVoucher()* — Customer tukar poin jadi voucher
🎁 *safeTransferFrom()* — Gift voucher ke teman (ERC1155 native)
✅ *redeemVoucher()* — Klaim voucher di cafe
💸 *claimRefund()* — Customer klaim balik MON jika cafe ga aktif 90 hari
🏅 *Badge otomatis* — Bronze (10x), Silver (50x), Gold (100x) kunjungan

━━━━━━━━━━━━━━━━━━━━━━

*📊 Web2 vs KopiLoyalty:*

Poin expired?     Web2: Bisa      | KopiLoyalty: Tidak pernah
Gift voucher?     Web2: Dilarang  | KopiLoyalty: Bebas (ERC1155)
Cross-cafe swap?  Web2: Butuh OVO | KopiLoyalty: Native, trustless
Cafe tutup?       Web2: Poin hangus | KopiLoyalty: claimRefund() → dapat MON balik
Dana transparan?  Web2: Ga ada    | KopiLoyalty: On-chain, publik
Proof of loyalty? Web2: Angka DB  | KopiLoyalty: NFT Badge, on-chain permanent

━━━━━━━━━━━━━━━━━━━━━━

*🚀 Tech Stack:*
• Chain: Monad Testnet (Chain ID: 10143)
• Contract: ERC1155 (Solady) — 1 contract untuk semua cafe
• Gas: ~$0.0001 per transaksi
• Finality: < 1 detik
• Backend: Supabase (metadata + event indexer)
• Frontend: Next.js + wagmi + viem

*Ini bukan "GoPay tapi di blockchain."*
*Ini infrastruktur loyalty yang ownership-nya beneran ada di tangan user.*
```

---

---

# BAGIAN 2 — FRONTEND DEV GUIDE

**Untuk:** Frontend Developer  
**Stack asumsi:** Next.js 14 (App Router) + wagmi v2 + viem  
**Contract standard:** ERC1155 (Solady)

---

## Setup Dasar

### Network Config

```typescript
// src/lib/chain.ts
import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://explorer.monad.xyz" },
  },
});
```

### ABI & Contract Address

File ABI sudah ada di **`src/lib/abi.ts`** (lihat file tersebut — berisi semua functions, events, dan errors).  
Jangan duplikasi ABI di file lain, cukup import dari sana.

```typescript
// src/lib/contract.ts
import { KOPILOYALTY_ABI } from "./abi";

// Ganti dengan address setelah deploy ke Monad Testnet
export const KOPILOYALTY_ADDRESS = "0x..." as `0x${string}`;

export { KOPILOYALTY_ABI };

// Konstanta penting (sama dengan nilai on-chain)
export const POINTS_PER_MON = 10_000n;   // 1 MON = 10.000 poin kapasitas
export const INACTIVITY_DAYS = 90;        // hari tanpa aktivitas sebelum refund bisa diklaim
```

> **PENTING:** Error definitions (`{ type: "error", ... }`) sudah ada di dalam ABI.  
> Ini wajib agar viem bisa decode custom error secara otomatis.

---

## Off-chain vs On-chain

Data yang **HANYA ada di Supabase** (tidak di contract):
- Nama cafe, lokasi, deskripsi, foto
- Earn rate: `IDR → poin` (contoh: Rp1.000 = 1 poin)
- Burn rate: `poin → diskon IDR` (contoh: 1.000 poin = Rp5.000 diskon)
- Deskripsi & gambar voucher
- Riwayat transaksi (disync dari on-chain events)

Data yang ada di **contract** (sumber kebenaran):
- Owner wallet tiap cafe
- Jumlah MON deposit dan kapasitas mint
- `pointsTokenId`, `circulatingPoints`, `lastActivity`
- Balance token setiap wallet
- Visit count per customer per cafe
- Badge yang sudah di-claim

---

## Error Handling

> Baca ini dulu sebelum implement fungsi apapun.

### Setup

File error handler sudah ada di **`src/utils/contractErrors.ts`**.  
Gunakan `parseContractError()` di semua `try/catch` yang menyentuh contract.

```typescript
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";

try {
  await writeContractAsync({ ... });
} catch (err) {
  const e = parseContractError(err);
  toast.error(e.userMessage);           // tampilkan ke user (Bahasa Indonesia)
  console.error(e.devMessage, e.raw);   // log untuk debugging
}
```

### Semua Custom Error dari Contract

| Error Name | Code | Kapan Terjadi | Pesan ke User |
|---|---|---|---|
| `Unauthorized` | `UNAUTHORIZED` | Bukan owner cafe | "Kamu bukan pemilik cafe ini." |
| `InsufficientBacking` | `INSUFFICIENT_BACKING` | Kapasitas mint habis | "Deposit cafe tidak cukup untuk mencetak poin sebanyak ini." |
| `InsufficientPoints` | `INSUFFICIENT_POINTS` | Poin customer kurang | "Poin kamu tidak cukup untuk transaksi ini." |
| `InvalidAmount` | `INVALID_AMOUNT` | Amount = 0, atau kasus edge lainnya | "Jumlah tidak valid." |
| `CafeNotFound` | `CAFE_NOT_FOUND` | cafeId tidak ada | "Cafe tidak ditemukan." |
| `VoucherNotFound` | `VOUCHER_NOT_FOUND` | voucherTokenId tidak ada | "Jenis voucher tidak ditemukan." |
| `CafeStillActive` | `CAFE_STILL_ACTIVE` | Refund dipanggil terlalu cepat | "Cafe masih aktif (belum 90 hari tanpa aktivitas)." |
| `TransferFailed` | `TRANSFER_FAILED` | ETH transfer gagal di claimRefund | "Transfer MON gagal. Coba lagi." |
| — | `USER_REJECTED` | User cancel di wallet | "Transaksi dibatalkan." |
| — | `NETWORK_ERROR` | Koneksi gagal | "Koneksi ke jaringan gagal." |

### Handle Error Spesifik

```typescript
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";

try {
  await writeContractAsync({ functionName: "claimRefund", args: [cafeId] });
} catch (err) {
  const e = parseContractError(err);

  if (e.code === KopiErrorCode.USER_REJECTED) return; // silent — user cancel
  if (e.code === KopiErrorCode.CAFE_STILL_ACTIVE) {
    toast.error("Cafe masih aktif. Cek lagi setelah 90 hari tanpa aktivitas.");
    return;
  }

  console.error(`[${e.code}] ${e.devMessage}`, e.raw);
  toast.error(e.userMessage);
}
```

### Best Practice: Simulate Dulu Sebelum Write

`simulateContract` decode custom error SEBELUM kirim tx — tidak buang gas kalau bakal gagal.

```typescript
import { usePublicClient, useWriteContract } from "wagmi";

const publicClient = usePublicClient();
const { writeContractAsync } = useWriteContract();

async function safeBuyVoucher(voucherTokenId: bigint, qty: bigint) {
  try {
    // 1. Validasi dulu (gratis, tidak kirim tx)
    await publicClient.simulateContract({
      address: KOPILOYALTY_ADDRESS,
      abi: KOPILOYALTY_ABI,
      functionName: "buyVoucher",
      args: [voucherTokenId, qty],
    });

    // 2. Kalau lolos simulasi, baru kirim tx
    await writeContractAsync({
      address: KOPILOYALTY_ADDRESS,
      abi: KOPILOYALTY_ABI,
      functionName: "buyVoucher",
      args: [voucherTokenId, qty],
    });

    toast.success("Voucher berhasil dibeli!");
  } catch (err) {
    const e = parseContractError(err);
    toast.error(e.userMessage);
    console.error(e.devMessage, e.raw);
  }
}
```

---

## Endpoint Reference (Write Functions)

### 1. `registerCafe()` — Daftarkan Cafe Baru

**Siapa:** Cafe owner saat onboarding  
**Tipe:** `payable`

```typescript
// Kapasitas poin = depositMON × 10.000
// Contoh: deposit 0.1 MON → kapasitas 1.000 poin

const hash = await writeContractAsync({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "registerCafe",
  value: parseEther("0.1"), // deposit awal, boleh 0
});

// Ambil cafeId & pointsTokenId dari event setelah tx confirm
const receipt = await waitForTransactionReceipt(publicClient, { hash });
const [log] = parseEventLogs({
  abi: KOPILOYALTY_ABI,
  logs: receipt.logs,
  eventName: "CafeRegistered",
});
const { cafeId, pointsTokenId } = log.args;
// → Simpan ke Supabase: cafes.chain_cafe_id, cafes.points_token_id
```

**Error:** tidak ada (selalu sukses jika gas cukup dan `msg.value <= ~79 MON`)

---

### 2. `deposit()` — Tambah Deposit Backing

**Siapa:** Cafe owner  
**Tipe:** `payable`  
**Kapan:** Saat `getMintablePoints(cafeId)` mendekati 0

```typescript
await writeContractAsync({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "deposit",
  args: [cafeId],
  value: parseEther("0.5"),
});
```

**Error:** `InvalidAmount` (value = 0), `Unauthorized` (bukan owner)

---

### 3. `mintPoints()` — Kasir Mint Poin ke Customer

**Siapa:** Cafe owner / kasir wallet  
**Kapan:** Setelah customer bayar

```typescript
// Kalkulasi amount di frontend berdasarkan data Supabase:
// amount = floor(billAmountIDR / earnRateIDRPerPoint)
// Contoh: Rp35.000, earn rate Rp1.000/poin → amount = 35n

await writeContractAsync({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "mintPoints",
  args: [cafeId, customerAddress, 35n],
});
// Event PointsMinted + kemungkinan BadgeMinted (jika 10/50/100 kunjungan)
```

**Error:** `Unauthorized`, `InvalidAmount`, `InsufficientBacking`

> Cek `getMintablePoints(cafeId)` sebelum mint. Kalau < jumlah yang mau dimint, tampilkan warning ke owner untuk deposit lebih.

---

### 4. `redeemPoints()` — Customer Burn Poin untuk Diskon

**Siapa:** Customer (wallet mereka sendiri)

```typescript
// Kalkulasi diskon di frontend (dari Supabase):
// discount = pointsToBurn * burnRateIDRPerPoint
// Contoh: 1.000 poin × Rp5/poin = Rp5.000 diskon

await writeContractAsync({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "redeemPoints",
  args: [cafeId, 1000n],
});
```

**Error:** `InvalidAmount`, `CafeNotFound`, `InsufficientPoints`

---

### 5. `createVoucherType()` — Cafe Buat Tipe Voucher

**Siapa:** Cafe owner

```typescript
// Output: voucherTokenId — simpan ke Supabase: voucher_types.token_id
const { result: voucherTokenId } = await publicClient.simulateContract({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "createVoucherType",
  args: [
    cafeId,
    1000n,  // pointCost: 1.000 poin per voucher
    0n,     // supply: 0 = tidak langsung mint ke owner
  ],
});
```

**Error:** `Unauthorized`, `InvalidAmount` (pointCost = 0)

---

### 6. `buyVoucher()` — Customer Beli Voucher dengan Poin

**Siapa:** Customer

```typescript
await writeContractAsync({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "buyVoucher",
  args: [voucherTokenId, 1n],
});
// Efek: burn (qty × pointCost) poin, mint qty voucher ke wallet customer
```

**Validasi dulu di frontend:**
```typescript
const vt = await readContract({ functionName: "voucherTypes", args: [voucherTokenId] });
const cafe = await readContract({ functionName: "getCafe", args: [vt.cafeId] });
const balance = await readContract({
  functionName: "balanceOf",
  args: [userAddress, cafe.pointsTokenId],
});
if (balance < vt.pointCost) {
  // "Poin tidak cukup. Kamu punya X poin, butuh Y poin."
}
```

**Error:** `InvalidAmount`, `VoucherNotFound`, `InsufficientPoints`

---

### 7. `safeTransferFrom()` — Gift Voucher ke Teman

**Siapa:** Customer yang punya voucher  
**Fungsi ERC1155 standar — tidak custom**

```typescript
await writeContractAsync({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "safeTransferFrom",
  args: [senderAddress, friendAddress, voucherTokenId, 1n, "0x"],
});
```

---

### 8. `redeemVoucher()` — Klaim Voucher di Cafe

**Siapa:** Customer / siapapun yang pegang voucher

```typescript
await writeContractAsync({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "redeemVoucher",
  args: [voucherTokenId],
});
// Event VoucherRedeemed → kasir lihat ini sebagai konfirmasi
```

**Error:** `InvalidAmount` (tidak punya voucher ini), `VoucherNotFound`

---

### 9. `claimRefund()` — Customer Klaim MON Balik *(fitur baru)*

**Siapa:** Customer yang masih punya poin  
**Kapan:** Setelah cafe tidak ada aktivitas selama ≥ 90 hari  
**Efek:** Burn semua poin customer, transfer MON proporsional ke wallet customer

```typescript
// Cek dulu apakah refund bisa diklaim (gratis)
const isClaimable = await readContract({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "isRefundClaimable",
  args: [cafeId],
});

if (!isClaimable) {
  toast.error("Cafe masih aktif. Refund belum bisa diklaim.");
  return;
}

// Kalau sudah bisa, klaim
await writeContractAsync({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "claimRefund",
  args: [cafeId],
});
// Customer otomatis terima MON = (balancePoin / totalCirculating) × depositCafe
```

**Formula refund (tampilkan preview ke user):**
```typescript
const { depositAmount, circulatingPoints } = await readContract({
  functionName: "getCafe",
  args: [cafeId],
});
const { pointsTokenId } = await readContract({ functionName: "getCafe", args: [cafeId] });
const myPoints = await readContract({
  functionName: "balanceOf",
  args: [userAddress, pointsTokenId],
});

const estimatedRefundWei = (depositAmount * myPoints) / circulatingPoints;
// Tampilkan: `Estimasi refund: ${formatEther(estimatedRefundWei)} MON`
```

**Error:** `CafeNotFound`, `CafeStillActive`, `InvalidAmount` (tidak punya poin / circulating = 0), `TransferFailed`

---

## Endpoint Reference (Read Functions)

### `getCafe(cafeId)` — Data Lengkap Cafe

```typescript
const {
  owner,             // address: wallet owner cafe
  depositAmount,     // uint96: total MON deposit (wei) → formatEther()
  pointsTokenId,     // uint256: tokenId ERC1155 untuk poin cafe ini
  mintedPoints,      // uint256: total poin yang pernah dimint (all-time)
  circulatingPoints, // uint256: poin yang saat ini beredar (belum di-burn)
  lastActivity,      // uint40: timestamp aktivitas terakhir owner (unix)
} = await readContract({
  address: KOPILOYALTY_ADDRESS,
  abi: KOPILOYALTY_ABI,
  functionName: "getCafe",
  args: [cafeId],
});

// Hitung berapa hari sejak aktivitas terakhir:
const daysSinceActive = Math.floor((Date.now() / 1000 - Number(lastActivity)) / 86400);
```

**Gunakan di:** Dashboard owner, halaman detail cafe, preview refund

---

### `getMintablePoints(cafeId)` — Sisa Kapasitas Mint

```typescript
const remaining = await readContract({
  functionName: "getMintablePoints",
  args: [cafeId],
});
// remaining = 0 → owner harus deposit sebelum bisa mint lagi
// Tampilkan warning kalau remaining < 100
```

---

### `isRefundClaimable(cafeId)` — Cek Status Refund *(fitur baru)*

```typescript
const isClaimable = await readContract({
  functionName: "isRefundClaimable",
  args: [cafeId],
});
// true  → cafe sudah ≥ 90 hari tidak aktif, refund bisa diklaim
// false → cafe masih aktif
```

**Gunakan di:** Customer dashboard — tampilkan tombol "Klaim Refund" hanya kalau `true`

---

### `getBadgeTokenId(cafeId, tier)` — Token ID Badge *(fitur baru)*

```typescript
// tier: 0 = Bronze, 1 = Silver, 2 = Gold
// Token ID ini deterministik — bisa dihitung di frontend tanpa RPC call

const BADGE_BRONZE = 0;
const BADGE_SILVER = 1;
const BADGE_GOLD   = 2;

const bronzeTokenId = await readContract({
  functionName: "getBadgeTokenId",
  args: [cafeId, BADGE_BRONZE],
});

// Cek apakah customer sudah punya badge
const hasBronze = await readContract({
  functionName: "balanceOf",
  args: [customerAddress, bronzeTokenId],
});
// hasBronze > 0n → tampilkan badge Bronze di profile
```

---

### `visitCounts(cafeId, address)` — Jumlah Kunjungan Customer *(fitur baru)*

```typescript
const visits = await readContract({
  functionName: "visitCounts",
  args: [cafeId, customerAddress],
});
// Tampilkan: "Kunjunganmu: 42x | Berikutnya: Silver Badge di 50x"
```

---

### `balanceOf(address, tokenId)` — Cek Saldo Token

```typescript
// Cek poin
const pointBalance = await readContract({
  functionName: "balanceOf",
  args: [customerAddress, pointsTokenId],
});

// Cek voucher
const voucherBalance = await readContract({
  functionName: "balanceOf",
  args: [customerAddress, voucherTokenId],
});
```

**Tip:** Untuk load banyak token sekaligus, gunakan `balanceOfBatch`:
```typescript
const balances = await readContract({
  functionName: "balanceOfBatch",
  args: [
    [addr, addr, addr],
    [pointsTokenId, voucherId1, bronzeTokenId],
  ],
});
// balances[0] = poin, balances[1] = voucher, balances[2] = badge
```

---

## Events — Untuk Supabase Realtime Listener

| Event | Kapan Terjadi | Data yang Disimpan ke Supabase |
|---|---|---|
| `CafeRegistered` | Cafe baru register | `cafes.chain_cafe_id`, `cafes.points_token_id`, `cafes.owner_address` |
| `Deposited` | Owner deposit MON | Update `cafes.total_deposit` |
| `PointsMinted` | Customer dapat poin | Insert `transactions` (tipe: earn) |
| `PointsRedeemed` | Customer tukar poin | Insert `transactions` (tipe: redeem) |
| `VoucherTypeCreated` | Cafe buat voucher baru | Insert `voucher_types` |
| `VoucherPurchased` | Customer beli voucher | Insert `transactions` (tipe: voucher_buy) |
| `VoucherRedeemed` | Voucher diklaim | Update `voucher_types.redemption_count` |
| `TransferSingle` | Token pindah (gift, dsb.) | Insert `transfers` |
| `RefundClaimed` | Customer klaim MON balik | Insert `transactions` (tipe: refund), update `cafes.total_deposit` |
| `BadgeMinted` | Customer dapat badge baru | Insert `badges` (customer, cafeId, tier, visitCount) |

---

## Alur Lengkap per Halaman

### Halaman: Owner Dashboard

```
1. getCafe(cafeId)            → tampilkan deposit, circulatingPoints, lastActivity
2. getMintablePoints(cafeId)  → tampilkan sisa kapasitas + warning jika < 100
3. [Tombol Deposit]           → deposit(cafeId) dengan value
4. [Buat Voucher]             → createVoucherType(cafeId, cost, 0n)
5. isRefundClaimable(cafeId)  → kalau true, tampilkan alert "Cafe kamu terdeteksi tidak aktif"
```

### Halaman: QR Scan & Bayar (Kasir)

```
1. Customer scan QR → frontend decode: cafeId + ownerAddress
2. Customer input nominal (Rp35.000)
3. Frontend hitung poin: amount = floor(35000 / earnRate)  [dari Supabase]
4. Konfirmasi → mintPoints(cafeId, customerWallet, amount)
5. Tunggu tx confirm → animasi poin bertambah
6. Cek event BadgeMinted di receipt → kalau ada, tampilkan animasi badge baru
```

### Halaman: Customer Dashboard

```
1. getCafe(cafeId) → dapat pointsTokenId, circulatingPoints, lastActivity
2. balanceOf(wallet, pointsTokenId) → tampilkan saldo poin
3. visitCounts(cafeId, wallet) → tampilkan jumlah kunjungan + progress ke badge berikutnya
4. balanceOfBatch([wallet×4], [ptId, vId1, bronzeId, silverId]) → semua aset 1 call
5. isRefundClaimable(cafeId) → kalau true, tampilkan tombol "Klaim Refund"
6. [Tukar Poin]   → redeemPoints(cafeId, amount)
7. [Beli Voucher] → buyVoucher(voucherTokenId, qty)
8. [Gift Voucher] → safeTransferFrom(from, friendAddress, voucherId, 1n, "0x")
9. [Klaim Refund] → claimRefund(cafeId)   ← hanya tampil jika isRefundClaimable = true
```

### Halaman: Klaim Voucher (di Cafe)

```
1. Kasir scan QR voucher customer → dapat voucherTokenId
2. balanceOf(customerWallet, voucherTokenId) → verifikasi customer punya voucher
3. Customer konfirmasi → redeemVoucher(voucherTokenId)
4. Tunggu tx confirm → kasir apply diskon
```

### Halaman: Badge Collection (Customer Profile)

```
1. getBadgeTokenId(cafeId, 0/1/2) → dapat tokenId untuk Bronze/Silver/Gold
2. balanceOfBatch([wallet×3], [bronzeId, silverId, goldId]) → cek kepemilikan
3. visitCounts(cafeId, wallet) → tampilkan progress bar menuju badge berikutnya
   Contoh: "42 / 50 kunjungan → Silver Badge"
4. claimedBadges(cafeId, wallet) → bitmask: bit0=bronze, bit1=silver, bit2=gold
   Bisa dipakai untuk render badge yang sudah diraih tanpa banyak readContract
```

---

*Dokumen ini dibuat untuk KopiLoyalty — Monad Blitz Hackathon, April 2026*  
*Contract: KopiLoyalty.sol | Standard: ERC1155 (Solady) | Chain: Monad Testnet (10143)*  
*File referensi: `src/lib/abi.ts` (ABI), `src/utils/contractErrors.ts` (error handler)*

---

---

# BAGIAN 3 — FLOW USER + ALASAN WEB3

> Bagian ini menjelaskan setiap langkah dari sisi user beserta **alasan konkret kenapa langkah tersebut harus/lebih baik pakai Web3** dibanding Web2 biasa.  
> Gunakan ini sebagai referensi saat membangun UI dan saat menjelaskan ke stakeholder.

---

## Flow Cafe Owner

### LANGKAH 1 — Daftar Cafe (`registerCafe`)

```
Owner buka app → Connect wallet
    ↓
Klik "Daftarkan Cafe" → isi deposit MON awal
    ↓
registerCafe() dipanggil → dapat cafeId + pointsTokenId
    ↓
Simpan nama & info cafe ke Supabase (off-chain)
```

> **💡 Kenapa Web3?**  
> Di Web2, "kepemilikan" cafe di sistem loyalty = baris di database perusahaan. Bisa dicabut, bisa expire, platform bisa tutup. Di sini, kepemilikan tercatat on-chain secara permanen — tidak ada satu entitas pun (termasuk tim KopiLoyalty) yang bisa mencabut status owner kamu tanpa private key kamu sendiri.

---

### LANGKAH 2 — Deposit MON sebagai Backing (`deposit`)

```
Owner tambah modal → deposit(cafeId) + kirim MON
    ↓
Smart contract simpan di-escrow internal
    ↓
Kapasitas mint bertambah: +1 MON = +10.000 kapasitas poin
```

> **💡 Kenapa Web3?**  
> Di Web2, "dana jaminan" loyalty ada di rekening bank perusahaan — customer tidak tahu apakah dananya beneran ada. Di sini, siapapun bisa verifikasi on-chain: `getCafe(cafeId).depositAmount` — angka ini real, terkunci di smart contract, tidak bisa dipakai untuk hal lain. Ini yang membuat poin KopiLoyalty punya nilai nyata, bukan sekadar angka di database.

---

### LANGKAH 3 — Kasir Mint Poin ke Customer (`mintPoints`)

```
Customer bayar → kasir input nominal di app
    ↓
App hitung poin dari earn rate (Supabase)
    ↓
mintPoints(cafeId, customerWallet, amount) dipanggil oleh wallet kasir
    ↓
Poin (ERC1155 token) masuk ke wallet customer
    ↓
Jika kunjungan ke-10/50/100 → badge NFT otomatis masuk wallet juga
```

> **💡 Kenapa Web3?**  
> Di Web2, mint poin = update angka di database — bisa dimanipulasi admin, bisa rollback, bisa ada korupsi internal ("kasir tambah poin ke temannya sendiri"). Di sini, setiap mint adalah transaksi on-chain yang immutable dan publik. Siapapun bisa audit: "kasir ini mint berapa poin, ke siapa, kapan." Tidak ada yang bisa diam-diam tambah poin tanpa jejak.

---

### LANGKAH 4 — Buat Tipe Voucher (`createVoucherType`)

```
Owner buka dashboard → klik "Buat Voucher Baru"
    ↓
Isi: nama voucher (Supabase) + harga poin (on-chain)
Contoh: "Free Americano" = 100 poin
    ↓
createVoucherType(cafeId, 100, 0)
    ↓
Voucher langsung jadi token ERC1155 yang bisa dipegang di wallet manapun
```

> **💡 Kenapa Web3?**  
> Di Web2, voucher = barcode atau kode yang dipegang di database perusahaan — tidak bisa dipindahtangankan tanpa approval sistem, bisa expired kapan saja oleh admin. Di sini, voucher adalah NFT. Begitu customer beli, voucher itu milik mereka sepenuhnya — bisa di-gift ke teman, bisa disimpan di wallet manapun, bisa dipindah ke hardware wallet untuk keamanan ekstra. Tidak butuh izin siapapun.

---

### LANGKAH 5 — Tarik Deposit (`ownerWithdraw`)

```
Semua poin sudah habis di-redeem customer (circulatingPoints == 0)
    ↓
Owner klik "Tarik Deposit" → ownerWithdraw(cafeId)
    ↓
MON langsung transfer ke wallet owner — tanpa perantara
```

> **💡 Kenapa Web3?**  
> Di Web2, menarik dana dari program loyalty = ajukan request ke platform, tunggu approval, bayar fee, transfer lewat rekening. Di sini, smart contract enforce aturannya secara otomatis: jika kondisi terpenuhi (tidak ada poin beredar), dana langsung balik ke wallet owner. Tidak ada approval yang dibutuhkan, tidak ada fee platform, tidak ada antrean.

---

### LANGKAH 6 — Transfer Kepemilikan Cafe (`transferCafeOwnership` + `acceptCafeOwnership`)

```
Owner lama: transferCafeOwnership(cafeId, alamatBaru)
    ↓
Owner baru: acceptCafeOwnership(cafeId) [harus konfirmasi sendiri]
    ↓
Ownership resmi berpindah — event on-chain tercatat permanen
```

> **💡 Kenapa Web3?**  
> Mekanisme dua langkah ini tidak mungkin dibuat trustless di Web2. Di Web2, transfer kepemilikan bisnis = proses legal/administratif yang memerlukan kepercayaan pada pihak ketiga. Di sini, proses ini atomic dan self-enforcing: owner baru harus konfirmasi dari wallet mereka sendiri — tidak bisa "transfer ke alamat salah" dan kehilangan cafe secara permanen. Smart contract yang enforce, bukan manusia.

---

## Flow Customer

### LANGKAH 1 — Kunjungan & Dapat Poin

```
Datang ke cafe → bayar di kasir
    ↓
Kasir proses → scan QR / transaksi dari app
    ↓
Customer konfirmasi di wallet → poin ERC1155 masuk
    ↓
Dashboard app: saldo poin bertambah real-time
```

> **💡 Kenapa Web3?**  
> Di Web2 (GoPay Points, Starbucks Rewards, dsb.), poin hidup di database perusahaan — bisa expired kapan saja, bisa dihapus jika akun di-suspend, habis jika platform tutup. Di sini, poin hidup di wallet customer sendiri. Cafe tutup, server KopiLoyalty mati, tim bubar — poin tetap ada di wallet. Tidak ada yang bisa mengambil atau menghapusnya.

---

### LANGKAH 2 — Tukar Poin dengan Voucher (`buyVoucher`)

```
Customer buka app → pilih cafe → lihat katalog voucher
    ↓
Pilih "Free Kopi" (100 poin) → klik Tukar
    ↓
buyVoucher(voucherTokenId, 1) → 100 poin terbakar, 1 voucher NFT masuk wallet
    ↓
Voucher langsung bisa di-gift atau disimpan
```

> **💡 Kenapa Web3?**  
> Di Web2, voucher yang "dibeli" dengan poin masih di-kontrol platform — bisa expired tiba-tiba, tidak bisa dipindah ke orang lain, hilang kalau akun kena masalah. Di sini, begitu customer `buyVoucher`, token langsung ada di wallet mereka. Tidak ada expired. Bisa langsung gift ke teman lewat `safeTransferFrom` tanpa izin siapapun — ini adalah fitur native ERC1155 yang tidak membutuhkan kode tambahan apapun.

---

### LANGKAH 3 — Gift Voucher ke Teman (`safeTransferFrom`)

```
Customer punya voucher "Free Americano"
    ↓
Ketik alamat wallet teman → transfer
    ↓
Voucher pindah ke wallet teman — teman langsung bisa pakai di cafe
```

> **💡 Kenapa Web3?**  
> Fitur ini gratis dan sudah ada karena ERC1155 adalah standar token yang transferable by default. Di Web2, membuat sistem "gift voucher ke teman" membutuhkan backend kompleks, sistem verifikasi identitas, dan approval manual. Di sini, ini adalah perilaku dasar token — sama seperti transfer uang ke rekening teman, tapi tanpa bank sebagai perantara.

---

### LANGKAH 4 — Klaim Voucher di Cafe (`redeemVoucher`)

```
Customer tunjukkan voucher di app (QR / token ID)
    ↓
Kasir verifikasi: balanceOf(customerWallet, voucherTokenId) > 0
    ↓
Customer konfirmasi → redeemVoucher(voucherTokenId) → voucher terbakar
    ↓
Event VoucherRedeemed muncul on-chain → kasir apply diskon
```

> **💡 Kenapa Web3?**  
> Di Web2, verifikasi voucher bergantung pada koneksi ke server — kalau server down, kasir tidak bisa verifikasi. Di sini, kasir bisa verifikasi langsung ke blockchain (yang selalu online) tanpa butuh server KopiLoyalty sama sekali. Voucher yang sudah dipakai otomatis terbakar — tidak bisa dipakai dua kali, tidak bisa dipalsukan, tidak perlu sistem anti-fraud tambahan.

---

### LANGKAH 5 — Kumpulkan Badge (Otomatis)

```
Kunjungan ke-10  → Bronze Badge NFT masuk wallet otomatis
Kunjungan ke-50  → Silver Badge NFT
Kunjungan ke-100 → Gold Badge NFT
    ↓
Badge bisa ditampilkan di profil app, wallet, atau platform NFT manapun
```

> **💡 Kenapa Web3?**  
> Di Web2, "badge" atau "level member" adalah angka di database — tidak bisa dibuktikan ke pihak lain, tidak bisa dibawa keluar dari platform, tidak ada nilai nyata di luar ekosistem itu. Di sini, badge adalah NFT on-chain. Jika suatu hari ada 100 cafe yang pakai KopiLoyalty, badge Gold di Kopi Senja bisa jadi "bukti loyalitas" yang dikenali di seluruh ekosistem — bahkan dipakai sebagai syarat masuk komunitas, diskon silang antar cafe, atau apapun yang dibangun di atas standar ERC1155.

---

### LANGKAH 6 — Klaim Refund jika Cafe Tidak Aktif (`claimRefund`)

```
Kondisi: cafe tidak ada aktivitas selama ≥ 90 hari
    ↓
isRefundClaimable(cafeId) → true
    ↓
Customer klik "Klaim Refund"
    ↓
claimRefund(cafeId):
  → Semua poin customer terbakar
  → Customer terima MON proporsional langsung ke wallet
  Rumus: (poin_saya / total_poin_beredar) × deposit_cafe
```

> **💡 Kenapa Web3?**  
> Ini adalah fitur yang **secara fundamental tidak bisa direplikasi di Web2**. Di Web2, jika sebuah loyalty program tutup, poin hangus — tidak ada mekanisme untuk memaksa perusahaan memberikan refund. Di sini, refund dijamin oleh kode, bukan oleh niat baik cafe owner. Jika cafe tidak aktif 90 hari, siapapun bisa panggil `claimRefund()` dan smart contract secara otomatis — tanpa perlu persetujuan owner, tanpa bisa diblokir — mengirimkan MON proporsional ke wallet customer. Tidak ada yang bisa menolak. Tidak ada yang bisa kabur dengan uang customer.

---

## Ringkasan: Web2 vs Web3 per Fitur

| Fitur | Web2 | Web3 (KopiLoyalty) |
|-------|------|---------------------|
| Kepemilikan poin | Di database perusahaan | Di wallet user sendiri |
| Poin bisa expired? | Ya, kapan saja | Tidak pernah |
| Poin bisa dihapus admin? | Ya | Tidak — immutable |
| Voucher bisa di-gift? | Butuh sistem verifikasi kompleks | Native, gratis (ERC1155) |
| Voucher bisa dipalsukan? | Mungkin (jika sistem lemah) | Tidak — on-chain, cryptographic |
| Dana cafe transparan? | Tidak ada yang tahu | Siapapun bisa cek on-chain |
| Cafe kabur, poin hangus? | Ya | Tidak — `claimRefund()` enforce otomatis |
| Badge bisa dibawa ke luar platform? | Tidak | Ya — NFT standar |
| Transfer kepemilikan bisnis | Proses legal/manual | Atomic, self-enforcing, dua langkah |
| Server down, transaksi berhenti? | Ya | Tidak — blockchain selalu online |

---

*Dokumen ini dibuat untuk KopiLoyalty — Monad Blitz Hackathon, April 2026*  
*Contract: KopiLoyalty.sol | Standard: ERC1155 (Solady) | Chain: Monad Testnet (10143)*  
*File referensi: `src/lib/abi.ts` (ABI), `src/utils/contractErrors.ts` (error handler)*
