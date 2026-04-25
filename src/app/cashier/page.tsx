"use client";

import { useEffect, useMemo, useState } from "react";
import encodeQR from "qr";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { Coffee, Loader2, CheckCircle, ShieldAlert, QrCode, Store, ShieldCheck } from "lucide-react";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, DEFAULT_CAFE_ID } from "@/lib/contract";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";
import {
  listPendingPaymentSessions,
  logTransaction,
  supabase,
  updatePaymentSession,
  type PaymentSessionRow,
} from "@/lib/supabase";
import { CAFE_LOCATION, CAFE_NAME } from "@/lib/cafeConfig";
import { createMerchantQrPayload, serializeMerchantQrPayload } from "@/lib/merchantQr";
import { OperatorGate } from "@/components/OperatorGate";
import { useOperatorAccess } from "@/hooks/useOperatorAccess";
import { OPERATOR_ADDRESS } from "@/lib/operator";

const EARN_RATE = 1000;

export default function CashierPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { isConnected, isOwner, ownerAddress, isLoading } = useOperatorAccess();

  const [billAmount, setBillAmount] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintedPoints, setMintedPoints] = useState(0);
  const [pendingSessions, setPendingSessions] = useState<PaymentSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const bill = parseInt(billAmount.replace(/\D/g, "") || "0");
  const earnedPoints = Math.floor(bill / EARN_RATE);

  const selectedSession =
    pendingSessions.find((session) => session.id === selectedSessionId) ?? null;
  const customerAddress = selectedSession?.customer_address ?? "";

  const merchantPayload = useMemo(() => createMerchantQrPayload(DEFAULT_CAFE_ID), []);
  const merchantQrSvg = useMemo(
    () =>
      encodeQR(serializeMerchantQrPayload(merchantPayload), "svg", {
        ecc: "low",
        border: 4,
        scale: 10,
      }),
    [merchantPayload]
  );

  useEffect(() => {
    function fetchSessions() {
      setSessionsLoading(true);
      listPendingPaymentSessions(String(DEFAULT_CAFE_ID))
        .then(setPendingSessions)
        .catch(console.error)
        .finally(() => setSessionsLoading(false));
    }

    fetchSessions();

    const channel = supabase
      .channel(`payment-sessions-${String(DEFAULT_CAFE_ID)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_sessions" },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (pendingSessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }

    if (!selectedSessionId || !pendingSessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(pendingSessions[0].id);
    }
  }, [pendingSessions, selectedSessionId]);

  async function handleMint() {
    if (!isConnected || !address) {
      toast.error("Connect wallet dulu.");
      return;
    }
    if (!selectedSession) {
      toast.error("Pilih customer pending dulu.");
      return;
    }
    if (bill === 0) {
      toast.error("Masukkan nominal tagihan.");
      return;
    }

    setIsPending(true);
    try {
      const hash = await writeContractAsync({
        address: KOPILOYALTY_ADDRESS,
        abi: KOPILOYALTY_ABI,
        functionName: "mintPoints",
        args: [DEFAULT_CAFE_ID, selectedSession.customer_address as `0x${string}`, BigInt(earnedPoints)],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      await logTransaction({
        cafe_id: String(DEFAULT_CAFE_ID),
        cafe_name: CAFE_NAME,
        customer_address: selectedSession.customer_address,
        type: "earn",
        points: earnedPoints,
        idr_amount: bill,
        tx_hash: hash,
      });
      await updatePaymentSession(selectedSession.id, {
        status: "completed",
        bill_amount: bill,
        mint_tx_hash: hash,
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
          <p className="text-brown/60 text-sm mt-1">
            +{mintedPoints} poin to {customerAddress.slice(0, 8)}...
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
        <button
          onClick={() => {
            setTxHash(null);
            setSelectedSessionId(null);
            setBillAmount("");
          }}
          className="w-full bg-espresso text-white py-3 rounded-2xl font-semibold"
        >
          Transaksi Berikutnya
        </button>
      </div>
    );
  }

  return (
    <OperatorGate
      isConnected={isConnected}
      isLoading={isLoading}
      isOwner={isOwner}
      operatorAddress={OPERATOR_ADDRESS}
      ownerAddress={ownerAddress}
      title="Mode Kasir"
      description="Connect wallet owner cafe untuk membuka mode kasir."
    >
      <div className="flex flex-col min-h-screen pb-10">
        <div className="bg-espresso text-white px-5 pt-12 pb-6 rounded-b-3xl shadow-hero">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-2xs font-semibold uppercase tracking-[0.18em] text-cream mb-3">
                <ShieldCheck size={12} />
                Operator Mode
              </div>
              <h1 className="text-xl font-bold">Mode Kasir</h1>
              <p className="text-cream/70 text-xs mt-1">Show merchant QR and mint points after payment</p>
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
                <QrCode size={18} className="text-coffee" />
              </div>
              <div>
                <p className="text-sm font-semibold text-espresso">Merchant QR</p>
                <p className="text-xs text-brown/60">Customer scans this QR from the payment page.</p>
              </div>
            </div>

            <div className="w-64 h-64 mx-auto bg-white border-2 border-latte rounded-2xl p-3 shadow-card relative flex items-center justify-center overflow-hidden">
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: merchantQrSvg }}
              />
            </div>

            <div className="mt-4 text-center">
              <p className="font-semibold text-espresso">{CAFE_NAME}</p>
              <p className="text-xs text-mocha mt-1">{CAFE_LOCATION}</p>
              <p className="text-2xs text-mocha/70 mt-2">Cafe ID {String(DEFAULT_CAFE_ID)}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-cream shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
                <Store size={18} className="text-coffee" />
              </div>
              <div>
                <p className="text-sm font-semibold text-espresso">Pending Customers</p>
                <p className="text-xs text-brown/60">Customers who scanned QR and tapped "I'm Paying".</p>
              </div>
            </div>

            {sessionsLoading && (
              <div className="flex items-center gap-2 text-sm text-mocha">
                <Loader2 size={16} className="animate-spin text-coffee" />
                <span>Loading sessions...</span>
              </div>
            )}

            {!sessionsLoading && pendingSessions.length === 0 && (
              <p className="text-sm text-mocha">Belum ada customer pending.</p>
            )}

            <div className="flex flex-col gap-2">
              {pendingSessions.map((session) => {
                const active = session.id === selectedSessionId;
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left rounded-2xl px-4 py-3 border transition-colors ${active ? "border-espresso bg-latte" : "border-cream bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-espresso font-mono">
                          {session.customer_address.slice(0, 10)}...{session.customer_address.slice(-4)}
                        </p>
                        <p className="text-2xs text-mocha mt-1">
                          {new Date(session.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {active && (
                        <span className="text-2xs font-semibold text-espresso bg-white rounded-full px-2.5 py-1">
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-cream shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
                <Store size={18} className="text-coffee" />
              </div>
              <div>
                <p className="text-sm font-semibold text-espresso">Mint Customer Points</p>
                <p className="text-xs text-brown/60">Selected customer wallet is used automatically.</p>
              </div>
            </div>

            {selectedSession ? (
              <div className="rounded-2xl bg-latte px-4 py-3">
                <p className="text-2xs text-mocha mb-1">Selected wallet</p>
                <p className="text-sm font-mono font-semibold text-espresso">
                  {customerAddress.slice(0, 10)}...{customerAddress.slice(-6)}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-latte px-4 py-3">
                <p className="text-sm text-mocha">Pilih customer pending dulu.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-5 border border-cream shadow-card">
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

          {bill > 0 && selectedSession && (
            <div className="bg-latte rounded-3xl p-5 border border-cream shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Coffee size={16} className="text-mocha" />
                <span className="text-sm font-semibold text-espresso">Ringkasan</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-brown/70">Pelanggan</span>
                <span className="font-mono text-xs text-espresso">{customerAddress.slice(0, 10)}...</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-brown/70">Tagihan</span>
                <span className="font-medium">Rp {bill.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-brown/70">Session</span>
                <span className="font-medium text-espresso">
                  {new Date(selectedSession.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="border-t border-cream/60 pt-2 flex justify-between">
                <span className="font-semibold text-espresso">Poin diberikan</span>
                <span className="font-bold text-green-600">+{earnedPoints}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleMint}
            disabled={isPending || !selectedSession || bill === 0 || isOwner === false || !isConnected}
            className="bg-espresso text-white rounded-2xl py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-float"
          >
            {isPending && <Loader2 size={18} className="animate-spin" />}
            {isPending ? "Memproses..." : "Berikan Poin"}
          </button>
        </div>
      </div>
    </OperatorGate>
  );
}
