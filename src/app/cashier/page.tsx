"use client";

import { useState } from "react";
import { useAccount, useReadContract, usePublicClient, useWriteContract } from "wagmi";
import { isAddress } from "viem";
import { toast } from "sonner";
import { Coffee, ChevronLeft, Loader2, CheckCircle, ShieldAlert, Coins } from "lucide-react";
import Link from "next/link";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS } from "@/lib/contract";
import { CAFE_ID } from "@/lib/cafeConfig";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";
import { logTransaction } from "@/lib/supabase";

const EARN_RATE = 1000; // Rp1.000 = 1 point
const CAFE_NAME = "Kopi Tugu Jogja";

export default function CashierPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [customerAddress, setCustomerAddress] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintedPoints, setMintedPoints] = useState(0);

  const bill = parseInt(billAmount.replace(/\D/g, "") || "0");
  const earnedPoints = Math.floor(bill / EARN_RATE);
  const validAddress = isAddress(customerAddress);

  // Check if connected wallet is the cafe owner
  const { data: cafeData } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "getCafe",
    args: [CAFE_ID],
    query: { enabled: isConnected && !!address },
  });

  // getCafe tuple: [owner, depositAmount, pointsTokenId, ...]
  const isOwner = cafeData && address
    ? cafeData[0].toLowerCase() === address.toLowerCase()
    : null;

  // Remaining mintable capacity
  const { data: mintablePoints } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "getMintablePoints",
    args: [CAFE_ID],
    query: { enabled: isConnected && !!address },
  });

  const mintable = mintablePoints !== undefined ? Number(mintablePoints) : null;
  const lowCapacity = mintable !== null && mintable < 100;

  async function handleMint() {
    if (!isConnected || !address) { toast.error("Connect wallet dulu."); return; }
    if (!validAddress) { toast.error("Alamat pelanggan tidak valid."); return; }
    if (bill === 0) { toast.error("Masukkan nominal tagihan."); return; }

    setIsPending(true);
    try {
      const hash = await writeContractAsync({
        address: KOPILOYALTY_ADDRESS,
        abi: KOPILOYALTY_ABI,
        functionName: "mintPoints",
        args: [CAFE_ID, customerAddress as `0x${string}`, BigInt(earnedPoints)],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      await logTransaction({
        cafe_id: String(CAFE_ID),
        cafe_name: CAFE_NAME,
        customer_address: customerAddress,
        type: "earn",
        points: earnedPoints,
        idr_amount: bill,
        tx_hash: hash,
      });
      setMintedPoints(earnedPoints);
      setTxHash(hash);
      toast.success(`+${earnedPoints} poin dikirim ke pelanggan!`);
    } catch (err) {
      const e = parseContractError(err);
      if (e.code !== KopiErrorCode.USER_REJECTED) toast.error(e.userMessage);
      console.error(e.devMessage, e.raw);
    } finally {
      setIsPending(false);
    }
  }

  if (txHash) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center gap-5">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-espresso">Poin Terkirim!</h2>
          <p className="text-brown/60 text-sm mt-1">+{mintedPoints} poin → {customerAddress.slice(0, 8)}…</p>
        </div>
        <a
          href={`https://explorer.monad.xyz/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-mocha font-mono underline underline-offset-2 break-all"
        >
          {txHash.slice(0, 18)}…{txHash.slice(-8)}
        </a>
        <button
          onClick={() => { setTxHash(null); setCustomerAddress(""); setBillAmount(""); }}
          className="w-full bg-espresso text-white py-3 rounded-2xl font-semibold"
        >
          Transaksi Berikutnya
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-espresso text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="font-semibold">Mode Kasir</h1>
        </div>
        <p className="text-cream/60 text-xs ml-11">Mint poin untuk pelanggan</p>
      </div>

      <div className="px-5 py-6 flex flex-col gap-4">
        {/* Owner check */}
        {isConnected && isOwner === false && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
            <ShieldAlert size={20} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600">
              Wallet kamu bukan owner cafe ini. Hanya owner yang bisa mint poin.
            </p>
          </div>
        )}

        {/* Capacity warning */}
        {isConnected && isOwner === true && mintable !== null && (
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${lowCapacity ? "bg-amber-50 border border-amber-200" : "bg-earn-light border border-green-200"}`}>
            <Coins size={18} className={lowCapacity ? "text-amber-500" : "text-earn-green"} />
            <div>
              <p className={`text-sm font-medium ${lowCapacity ? "text-amber-700" : "text-earn-green"}`}>
                {lowCapacity ? "Kapasitas hampir habis!" : "Kapasitas mencukupi"}
              </p>
              <p className={`text-xs ${lowCapacity ? "text-amber-600" : "text-earn-green/70"}`}>
                Sisa kapasitas mint: <span className="font-semibold">{mintable.toLocaleString("id-ID")}</span> poin
                {lowCapacity && " — owner perlu deposit MON untuk menambah kapasitas"}
              </p>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700">
            Connect wallet owner cafe untuk menggunakan mode kasir.
          </div>
        )}

        {/* Customer address */}
        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
          <label className="text-xs text-brown/60 font-medium mb-2 block">Alamat Wallet Pelanggan</label>
          <input
            type="text"
            placeholder="0x..."
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value.trim())}
            className="w-full text-sm font-mono text-espresso border border-cream rounded-xl px-4 py-3 outline-none focus:border-mocha"
          />
          {customerAddress && !validAddress && (
            <p className="text-xs text-red-500 mt-1">Alamat tidak valid</p>
          )}
          {validAddress && (
            <p className="text-xs text-green-600 mt-1 font-medium">✓ Alamat valid</p>
          )}
        </div>

        {/* Bill amount */}
        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
          <label className="text-xs text-brown/60 font-medium mb-2 block">Nominal Tagihan</label>
          <div className="flex items-center gap-2">
            <span className="text-brown font-semibold">Rp</span>
            <input
              type="text"
              placeholder="0"
              value={billAmount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setBillAmount(raw ? parseInt(raw).toLocaleString("id-ID") : "");
              }}
              className="flex-1 text-2xl font-bold text-espresso outline-none bg-transparent"
            />
          </div>
          {bill > 0 && (
            <p className="text-xs text-green-600 mt-2 font-medium">
              Pelanggan mendapat +{earnedPoints} poin
            </p>
          )}
        </div>

        {/* Summary */}
        {bill > 0 && validAddress && (
          <div className="bg-latte rounded-2xl p-5 border border-cream">
            <div className="flex items-center gap-2 mb-3">
              <Coffee size={16} className="text-mocha" />
              <span className="text-sm font-semibold text-espresso">Ringkasan</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-brown/70">Pelanggan</span>
              <span className="font-mono text-xs text-espresso">{customerAddress.slice(0, 10)}…</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-brown/70">Tagihan</span>
              <span className="font-medium">Rp {bill.toLocaleString("id-ID")}</span>
            </div>
            <div className="border-t border-cream/60 pt-2 flex justify-between">
              <span className="font-semibold text-espresso">Poin diberikan</span>
              <span className="font-bold text-green-600">+{earnedPoints}</span>
            </div>
            {mintable !== null && earnedPoints > mintable && (
              <p className="text-xs text-red-500 mt-2 font-medium">
                Kapasitas tidak mencukupi. Sisa: {mintable.toLocaleString("id-ID")} poin.
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleMint}
          disabled={isPending || !validAddress || bill === 0 || isOwner === false || !isConnected || (mintable !== null && earnedPoints > mintable)}
          className="bg-espresso text-white rounded-2xl py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={18} className="animate-spin" />}
          {isPending ? "Memproses…" : "Berikan Poin"}
        </button>
      </div>
    </div>
  );
}
