"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { ChevronLeft, Gift, Loader2 } from "lucide-react";
import Link from "next/link";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, CAFE_ID, CAFE_NAME, BURN_RATE_IDR } from "@/lib/cafeConfig";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";
import { logTransaction } from "@/lib/supabase";
import { useCafePoints } from "@/hooks/useCafePoints";

export default function RedeemPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const { balance, pointsTokenId, isLoading } = useCafePoints(address as `0x${string}` | undefined);

  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isPending, setIsPending] = useState(false);

  const maxPoints = balance ?? 0;
  const discount = pointsToRedeem * BURN_RATE_IDR;

  async function handleRedeem() {
    if (!isConnected || !address) { toast.error("Connect wallet dulu ya."); return; }
    if (pointsToRedeem === 0) { toast.error("Pilih jumlah poin yang mau ditukar."); return; }
    if (pointsTokenId === undefined) { toast.error("Data cafe belum dimuat. Coba lagi."); return; }

    setIsPending(true);
    try {
      await publicClient!.simulateContract({
        address: KOPILOYALTY_ADDRESS,
        abi: KOPILOYALTY_ABI,
        functionName: "redeemPoints",
        args: [CAFE_ID, BigInt(pointsToRedeem)],
        account: address,
      });
      const hash = await writeContractAsync({
        address: KOPILOYALTY_ADDRESS,
        abi: KOPILOYALTY_ABI,
        functionName: "redeemPoints",
        args: [CAFE_ID, BigInt(pointsToRedeem)],
      });
      toast.success(`${pointsToRedeem} poin berhasil ditukar! Hemat Rp ${discount.toLocaleString("id-ID")}`);
      setPointsToRedeem(0);
      try {
        await logTransaction({
          cafe_id: String(CAFE_ID),
          cafe_name: CAFE_NAME,
          customer_address: address,
          type: "redeem",
          points: -pointsToRedeem,
          idr_amount: discount,
          tx_hash: hash,
        });
      } catch {
        toast.warning("Transaksi berhasil, tapi gagal tersimpan ke riwayat.");
      }
    } catch (err) {
      const e = parseContractError(err);
      if (e.code !== KopiErrorCode.USER_REJECTED) toast.error(e.userMessage);
      console.error(e.devMessage, e.raw);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-espresso text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="font-semibold">Tukar Poin</h1>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-5">
        {/* Points balance */}
        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm text-center">
          <p className="text-xs text-brown/60 mb-1">Poin Kamu</p>
          {!isConnected ? (
            <p className="text-2xl font-bold text-espresso/30">--</p>
          ) : isLoading ? (
            <div className="flex justify-center py-2"><Loader2 size={24} className="animate-spin text-mocha" /></div>
          ) : (
            <p className="text-4xl font-bold text-espresso">{maxPoints.toLocaleString("id-ID")}</p>
          )}
          <p className="text-xs text-brown/50 mt-1">points</p>
        </div>

        {/* Slider */}
        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
          <div className="flex justify-between mb-3">
            <span className="text-sm font-semibold text-espresso">Jumlah Poin</span>
            <span className="text-sm font-bold text-mocha">{pointsToRedeem.toLocaleString("id-ID")}</span>
          </div>
          <input
            type="range"
            min={0}
            max={maxPoints}
            step={Math.max(1, Math.floor(maxPoints / 20))}
            value={pointsToRedeem}
            onChange={(e) => setPointsToRedeem(Number(e.target.value))}
            disabled={maxPoints === 0}
            className="w-full accent-espresso disabled:opacity-40"
          />
          <div className="flex justify-between text-xs text-brown/50 mt-1">
            <span>0</span>
            <span>{maxPoints.toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* Savings preview */}
        <div className="bg-latte rounded-2xl p-5 border border-cream">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-mocha" />
            <span className="text-sm font-semibold text-espresso">Estimasi Diskon</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-brown/70">Poin dipilih</span>
            <span className="font-medium">{pointsToRedeem.toLocaleString("id-ID")}</span>
          </div>
          <div className="border-t border-cream/60 pt-2 flex justify-between">
            <span className="font-semibold text-espresso">Nilai diskon</span>
            <span className="font-bold text-green-600 text-lg">
              Rp {discount.toLocaleString("id-ID")}
            </span>
          </div>
          <p className="text-xs text-brown/40 mt-2">1 poin = Rp {BURN_RATE_IDR} diskon</p>
        </div>

        <button
          onClick={handleRedeem}
          disabled={isPending || pointsToRedeem === 0 || !isConnected}
          className="bg-espresso text-white rounded-2xl py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={18} className="animate-spin" />}
          {isPending ? "Memproses..." : "Terapkan Diskon"}
        </button>
      </div>
    </div>
  );
}
