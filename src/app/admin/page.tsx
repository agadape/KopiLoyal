"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { toast } from "sonner";
import { Coffee, ShieldCheck, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS } from "@/lib/contract";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [depositMon, setDepositMon] = useState("0.1");
  const [isPending, setIsPending] = useState(false);
  const [cafeIdInput, setCafeIdInput] = useState("1");

  const cafeIdBig = BigInt(cafeIdInput || "0");

  const { data: cafeData, refetch: refetchCafe } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "getCafe",
    args: [cafeIdBig],
    query: { enabled: cafeIdBig > 0n },
  });

  async function handleRegister() {
    if (!isConnected || !address) { toast.error("Connect wallet dulu."); return; }
    setIsPending(true);
    try {
      const value = parseEther(depositMon || "0");
      const hash = await writeContractAsync({
        address: KOPILOYALTY_ADDRESS,
        abi: KOPILOYALTY_ABI,
        functionName: "registerCafe",
        value,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      toast.success("Cafe berhasil didaftarkan! Cek cafeId di bawah.");
      refetchCafe();
    } catch (err) {
      const e = parseContractError(err);
      if (e.code !== KopiErrorCode.USER_REJECTED) toast.error(e.userMessage);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-12 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-espresso rounded-xl flex items-center justify-center">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-espresso text-lg">Admin Panel</h1>
          <p className="text-xs text-brown/60">Hanya untuk pemilik cafe</p>
        </div>
      </div>

      {/* Register Cafe */}
      <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm mb-4">
        <h2 className="font-semibold text-espresso mb-4">Daftarkan Cafe</h2>
        <label className="text-xs text-brown/60 font-medium mb-1 block">Deposit MON (untuk poin reward)</label>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            step="0.01"
            min="0"
            value={depositMon}
            onChange={(e) => setDepositMon(e.target.value)}
            className="flex-1 border border-cream rounded-xl px-4 py-2.5 text-espresso font-semibold outline-none focus:border-mocha"
          />
          <span className="text-brown font-semibold">MON</span>
        </div>
        <button
          onClick={handleRegister}
          disabled={isPending || !isConnected}
          className="w-full bg-espresso text-white rounded-xl py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {isPending ? "Mendaftarkan…" : "Daftarkan Cafe"}
        </button>
      </div>

      {/* Lookup Cafe */}
      <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm mb-4">
        <h2 className="font-semibold text-espresso mb-4">Cek Info Cafe</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            min="1"
            value={cafeIdInput}
            onChange={(e) => setCafeIdInput(e.target.value)}
            placeholder="Cafe ID"
            className="flex-1 border border-cream rounded-xl px-4 py-2.5 text-espresso font-semibold outline-none focus:border-mocha"
          />
          <button
            onClick={() => refetchCafe()}
            className="bg-latte text-espresso px-4 rounded-xl font-medium text-sm"
          >
            Cek
          </button>
        </div>

        {cafeData && (
          // tuple: [owner, depositAmount, pointsTokenId, mintedPoints, circulatingPoints, lastActivity]
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Owner" value={`${cafeData[0].slice(0, 10)}...${cafeData[0].slice(-6)}`} />
            <Row label="Points Token ID" value={cafeData[2].toString()} />
            <Row label="Minted Points" value={cafeData[3].toString()} />
            <Row label="Circulating" value={cafeData[4].toString()} />
            <Row label="Deposit" value={`${Number(cafeData[1]) / 1e18} MON`} />
            {address && cafeData[0].toLowerCase() === address.toLowerCase() && (
              <div className="mt-2 bg-green-50 text-green-700 text-xs rounded-xl px-3 py-2 font-medium">
                Wallet kamu adalah owner cafe ini
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cashier link */}
      <Link
        href="/cashier"
        className="bg-white rounded-2xl p-5 border border-cream shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Coffee size={20} className="text-mocha" />
          <div>
            <p className="font-semibold text-espresso text-sm">Mode Kasir</p>
            <p className="text-xs text-brown/60">Mint poin untuk pelanggan</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-brown/40" />
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-brown/60">{label}</span>
      <span className="font-medium text-espresso font-mono">{value}</span>
    </div>
  );
}
