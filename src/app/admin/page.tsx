"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { toast } from "sonner";
import { Coffee, ShieldCheck, Loader2, ChevronRight, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, DEFAULT_CAFE_ID } from "@/lib/contract";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";
import { OperatorGate } from "@/components/OperatorGate";
import { useOperatorAccess } from "@/hooks/useOperatorAccess";
import { CAFE_LOCATION, CAFE_NAME } from "@/lib/cafeConfig";
import { OPERATOR_ADDRESS } from "@/lib/operator";

export default function AdminPage() {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { isConnected, isOwner, ownerAddress, isLoading, address } = useOperatorAccess();

  const [depositMon, setDepositMon] = useState("0.1");
  const [isPending, setIsPending] = useState(false);
  const [cafeIdInput, setCafeIdInput] = useState(String(DEFAULT_CAFE_ID));

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
    <OperatorGate
      isConnected={isConnected}
      isLoading={isLoading}
      isOwner={isOwner}
      operatorAddress={OPERATOR_ADDRESS}
      ownerAddress={ownerAddress}
      title="Admin Panel"
      description="Connect wallet owner cafe untuk membuka pengaturan operator."
    >
      <div className="flex flex-col min-h-screen pb-10">
        <div className="bg-espresso text-white px-5 pt-12 pb-6 rounded-b-3xl shadow-hero">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-2xs font-semibold uppercase tracking-[0.18em] text-cream mb-3">
                <ShieldCheck size={12} />
                Operator Mode
              </div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-cream/70 text-xs mt-1">Kelola cafe, cek data on-chain, dan buka mode kasir.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
              <p className="text-2xs text-cream/70">Cafe</p>
              <p className="text-sm font-semibold">{CAFE_NAME}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-5 border border-cream shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
                <Store size={18} className="text-coffee" />
              </div>
              <div>
                <p className="text-sm font-semibold text-espresso">Operator Account</p>
                <p className="text-xs text-brown/60">Wallet ini satu-satunya akun yang diizinkan untuk admin dan kasir.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-latte px-4 py-3">
              <p className="text-2xs text-mocha mb-1">Owner wallet</p>
              <p className="text-sm font-mono font-semibold text-espresso">
                {ownerAddress ? `${ownerAddress.slice(0, 10)}...${ownerAddress.slice(-6)}` : "-"}
              </p>
              <p className="text-2xs text-mocha mt-2">{CAFE_LOCATION}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-cream shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
                <Wallet size={18} className="text-coffee" />
              </div>
              <div>
                <p className="text-sm font-semibold text-espresso">Daftarkan Cafe</p>
                <p className="text-xs text-brown/60">Deposit MON untuk menambah kapasitas poin reward.</p>
              </div>
            </div>

            <label className="text-xs text-brown/60 font-medium mb-1 block">Deposit MON</label>
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
              className="w-full bg-espresso text-white rounded-2xl py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              {isPending ? "Mendaftarkan..." : "Daftarkan Cafe"}
            </button>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-cream shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
                <ShieldCheck size={18} className="text-coffee" />
              </div>
              <div>
                <p className="text-sm font-semibold text-espresso">Cek Info Cafe</p>
                <p className="text-xs text-brown/60">Lihat owner, deposit, token id, dan supply poin saat ini.</p>
              </div>
            </div>

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
              <div className="flex flex-col gap-2 text-sm">
                <Row label="Owner" value={`${cafeData[0].slice(0, 10)}...${cafeData[0].slice(-6)}`} />
                <Row label="Points Token ID" value={cafeData[2].toString()} />
                <Row label="Minted Points" value={cafeData[3].toString()} />
                <Row label="Circulating" value={cafeData[4].toString()} />
                <Row label="Deposit" value={`${Number(cafeData[1]) / 1e18} MON`} />
              </div>
            )}
          </div>

          <Link
            href="/cashier"
            className="bg-white rounded-3xl p-5 border border-cream shadow-card flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
                <Coffee size={20} className="text-mocha" />
              </div>
              <div>
                <p className="font-semibold text-espresso text-sm">Mode Kasir</p>
                <p className="text-xs text-brown/60">Tampilkan QR merchant dan mint poin pelanggan</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-brown/40" />
          </Link>
        </div>
      </div>
    </OperatorGate>
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
