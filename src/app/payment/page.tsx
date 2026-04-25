"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { Coffee, ChevronLeft, CheckCircle, Info } from "lucide-react";
import Link from "next/link";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, CAFE_ID, CAFE_NAME, BURN_RATE_IDR } from "@/lib/cafeConfig";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";
import { logTransaction } from "@/lib/supabase";
import { useCafePoints } from "@/hooks/useCafePoints";

export default function PaymentPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const { balance: pointBalance, pointsTokenId, isLoading: pointsLoading } = useCafePoints(
    address as `0x${string}` | undefined
  );

  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [redeemedPoints, setRedeemedPoints] = useState(0);

  const maxPoints = pointBalance ?? 0;
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
      setRedeemedPoints(pointsToRedeem);
      setTxHash(hash);
      toast.success(`${pointsToRedeem} poin berhasil ditukar!`);
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

  if (txHash) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center gap-5">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-espresso">Poin Berhasil Ditukar!</h2>
          <p className="text-brown/60 text-sm mt-1">
            -{redeemedPoints} poin - hemat Rp {(redeemedPoints * BURN_RATE_IDR).toLocaleString("id-ID")}
          </p>
        </div>
        <a
          href={`https://explorer.monad.xyz/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-mocha font-mono underline underline-offset-2 break-all"
        >
          {txHash.slice(0, 18)}...{txHash.slice(-8)}
        </a>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => { setTxHash(null); setUsePoints(false); setPointsToRedeem(0); }}
            className="flex-1 bg-espresso text-white px-8 py-3 rounded-2xl font-semibold"
          >
            Selesai
          </button>
          <Link href="/history" className="flex-1 bg-latte text-espresso px-8 py-3 rounded-2xl font-semibold text-center">
            Riwayat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-espresso text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="font-semibold">Bayar &amp; Redeem Poin</h1>
        </div>

        {/* Address QR for cashier to scan */}
        <div className="bg-white rounded-2xl p-5 text-center mx-2">
          <div className="flex items-center gap-2 justify-center mb-3">
            <Coffee size={16} className="text-espresso" />
            <span className="text-espresso font-semibold text-sm">{CAFE_NAME}</span>
          </div>
          <div className="w-40 h-40 mx-auto bg-espresso/5 rounded-xl flex items-center justify-center border-2 border-dashed border-espresso/20">
            <div className="grid grid-cols-7 gap-px w-28 h-28">
              {Array.from({ length: 49 }).map((_, i) => {
                const seed = address ? parseInt(address.slice(2 + (i % 20), 4 + (i % 20)), 16) : i * 37;
                const filled = (seed ^ (i * 13)) % 2 === 0;
                return (
                  <div key={i} className={`rounded-sm ${filled ? "bg-espresso" : "bg-transparent"}`} />
                );
              })}
            </div>
          </div>
          <p className="text-xs text-brown/50 mt-2">
            {isConnected && address ? `${address.slice(0, 10)}...` : "Connect wallet untuk QR"}
          </p>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-4">
        {/* Cashier-only notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
          <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Penambahan poin dilakukan oleh kasir cafe.</span>
            {" "}Tunjukkan QR di atas ke kasir saat bayar. Kasir akan mint poin ke wallet kamu.
          </p>
        </div>

        {/* Points balance */}
        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
          <p className="text-xs text-brown/60 mb-1">Poin kamu saat ini</p>
          {!isConnected ? (
            <p className="text-2xl font-bold text-espresso/30">--</p>
          ) : pointsLoading ? (
            <p className="text-sm text-brown/50">Memuat...</p>
          ) : (
            <p className="text-2xl font-bold text-espresso">{maxPoints.toLocaleString("id-ID")} pts</p>
          )}
        </div>

        {/* Redeem toggle */}
        {isConnected && maxPoints > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-espresso">Tukar Poin sekarang</span>
              <button
                onClick={() => { setUsePoints(!usePoints); setPointsToRedeem(0); }}
                className={`w-11 h-6 rounded-full transition-colors ${usePoints ? "bg-espresso" : "bg-cream"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${usePoints ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            {usePoints && (
              <div>
                <input
                  type="range"
                  min={0}
                  max={maxPoints}
                  step={Math.max(1, Math.floor(maxPoints / 20))}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                  className="w-full accent-espresso"
                />
                <div className="flex justify-between text-xs text-brown/60 mt-1">
                  <span>0</span>
                  <span className="font-semibold text-espresso">{pointsToRedeem.toLocaleString("id-ID")} poin</span>
                  <span>{maxPoints.toLocaleString("id-ID")}</span>
                </div>
                {pointsToRedeem > 0 && (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    Hemat Rp {discount.toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {usePoints && pointsToRedeem > 0 && (
          <button
            onClick={handleRedeem}
            disabled={isPending}
            className="bg-espresso text-white rounded-2xl py-4 font-semibold disabled:opacity-50"
          >
            {isPending ? "Memproses..." : `Tukar ${pointsToRedeem.toLocaleString("id-ID")} Poin`}
          </button>
        )}
      </div>
    </div>
  );
}
