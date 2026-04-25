"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { ChevronLeft, Coins, Loader2, Sparkles, Info, CheckCircle } from "lucide-react";
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
  const [done, setDone] = useState(false);

  const maxPoints = balance ?? 0;
  const discount = pointsToRedeem * BURN_RATE_IDR;
  const exampleBill = 45000;
  const finalPayable = Math.max(0, exampleBill - discount);
  const savePct = exampleBill > 0 ? Math.round((discount / exampleBill) * 100) : 0;
  const MIN_REDEEM = 100;

  async function handleRedeem() {
    if (!isConnected || !address) { toast.error("Connect your wallet first."); return; }
    if (pointsToRedeem < MIN_REDEEM) { toast.error(`Minimum ${MIN_REDEEM} points to redeem.`); return; }
    if (pointsTokenId === undefined) { toast.error("Cafe data not loaded. Try again."); return; }

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
      toast.success(`${pointsToRedeem} points redeemed!`);
      setDone(true);
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
        toast.warning("Transaction saved, but history sync failed.");
      }
    } catch (err) {
      const e = parseContractError(err);
      if (e.code !== KopiErrorCode.USER_REJECTED) toast.error(e.userMessage);
    } finally {
      setIsPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6 bg-latte-light">
        <div className="w-24 h-24 bg-earn-light rounded-full flex items-center justify-center shadow-card">
          <CheckCircle size={44} className="text-earn-green" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-espresso">Discount Applied!</h2>
          <p className="text-mocha text-sm mt-1">You saved Rp {discount.toLocaleString("id-ID")}</p>
        </div>
        <button
          onClick={() => { setDone(false); setPointsToRedeem(0); }}
          className="w-full bg-espresso text-white py-4 rounded-2xl font-semibold text-sm shadow-float"
        >
          Redeem More
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-latte-light">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3">
        <Link href="/" className="w-9 h-9 rounded-full bg-latte flex items-center justify-center">
          <ChevronLeft size={20} className="text-coffee" />
        </Link>
        <h1 className="font-semibold text-espresso text-base">Use Your Points</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4 pb-24">
        {/* ── Points Balance Card ── */}
        <div className="bg-espresso rounded-3xl p-5 shadow-hero">
          <p className="text-cream/70 text-xs font-medium mb-2">Your Points Balance</p>
          <div className="flex items-center gap-2">
            {!isConnected ? (
              <span className="text-3xl font-bold text-white/30">--</span>
            ) : isLoading ? (
              <Loader2 size={28} className="animate-spin text-cream/60" />
            ) : (
              <>
                <span className="text-4xl font-bold text-white tracking-tight">
                  {maxPoints.toLocaleString("id-ID")}
                </span>
                <Coins size={22} className="text-gold" />
              </>
            )}
          </div>
        </div>

        {/* ── Slider ── */}
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <p className="text-sm font-semibold text-espresso mb-1">How many points do you want to use?</p>

          {/* Large number display */}
          <div className="flex items-baseline gap-2 my-4">
            <span className="text-4xl font-bold text-espresso">
              {pointsToRedeem.toLocaleString("id-ID")}
            </span>
            <span className="text-sm text-mocha font-medium">points</span>
          </div>

          <input
            type="range"
            min={0}
            max={maxPoints}
            step={Math.max(1, Math.floor(maxPoints / 20))}
            value={pointsToRedeem}
            onChange={(e) => setPointsToRedeem(Number(e.target.value))}
            disabled={maxPoints === 0 || !isConnected}
            className="w-full disabled:opacity-40"
            style={{
              background: maxPoints > 0
                ? `linear-gradient(to right, #2E7D32 ${(pointsToRedeem / maxPoints) * 100}%, #EDD9C0 0%)`
                : "#EDD9C0"
            }}
          />
          <div className="flex justify-between text-2xs text-mocha mt-1.5">
            <span>0</span>
            <span>{maxPoints.toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* ── Savings Breakdown ── */}
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              <p className="text-sm font-semibold text-espresso">You will save</p>
            </div>
            <span className="text-xl font-bold text-earn-green">
              Rp {discount.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-mocha">Bill Amount</span>
              <span className="font-medium text-espresso">Rp {exampleBill.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mocha">Discount ({pointsToRedeem.toLocaleString("id-ID")} pts)</span>
              <span className="font-medium text-earn-green">- Rp {discount.toLocaleString("id-ID")}</span>
            </div>
            <div className="border-t border-latte pt-2.5 flex justify-between">
              <span className="font-semibold text-espresso">Final Payable</span>
              <span className="font-bold text-espresso text-base">Rp {finalPayable.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {savePct > 0 && pointsToRedeem > 0 && (
            <div className="mt-4 bg-earn-light rounded-xl px-4 py-2.5 flex items-center gap-2">
              <CheckCircle size={14} className="text-earn-green" />
              <span className="text-xs text-earn-green font-semibold">Nice choice! You save {savePct}%</span>
            </div>
          )}
        </div>

        {/* ── Apply Button ── */}
        <button
          onClick={handleRedeem}
          disabled={isPending || pointsToRedeem < MIN_REDEEM || !isConnected}
          className="w-full bg-espresso text-white rounded-2xl py-4 font-semibold text-sm shadow-float disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          {isPending && <Loader2 size={18} className="animate-spin" />}
          {isPending ? "Processing..." : "Apply Discount"}
        </button>

        {/* Info */}
        <div className="flex items-center justify-center gap-1.5">
          <Info size={12} className="text-mocha/60" />
          <p className="text-2xs text-mocha/60">Minimum {MIN_REDEEM} points to redeem</p>
        </div>
      </div>
    </div>
  );
}
