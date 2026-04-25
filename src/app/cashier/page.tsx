"use client";

import { useEffect, useMemo, useState } from "react";
import encodeQR from "qr";
import { useAccount, useReadContract, usePublicClient, useWriteContract } from "wagmi";
import { isAddress } from "viem";
import { toast } from "sonner";
import { Coffee, ChevronLeft, Loader2, CheckCircle, ShieldAlert, QrCode, Store } from "lucide-react";
import Link from "next/link";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, DEFAULT_CAFE_ID } from "@/lib/contract";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";
import { listPendingPaymentSessions, logTransaction, supabase, updatePaymentSession, type PaymentSessionRow } from "@/lib/supabase";
import { CAFE_LOCATION, CAFE_NAME } from "@/lib/cafeConfig";
import { createMerchantQrPayload, serializeMerchantQrPayload } from "@/lib/merchantQr";

const EARN_RATE = 1000;

export default function CashierPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [customerAddress, setCustomerAddress] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintedPoints, setMintedPoints] = useState(0);
  const [pendingSessions, setPendingSessions] = useState<PaymentSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const bill = parseInt(billAmount.replace(/\D/g, "") || "0");
  const earnedPoints = Math.floor(bill / EARN_RATE);
  const validAddress = isAddress(customerAddress);

  const merchantPayload = useMemo(
    () => createMerchantQrPayload(DEFAULT_CAFE_ID, CAFE_NAME, CAFE_LOCATION),
    []
  );
  const merchantQrSvg = useMemo(
    () =>
      encodeQR(serializeMerchantQrPayload(merchantPayload), "svg", {
        ecc: "medium",
        border: 2,
        scale: 6,
      }),
    [merchantPayload]
  );

  const { data: cafeData } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "getCafe",
    args: [DEFAULT_CAFE_ID],
    query: { enabled: isConnected && !!address },
  });

  const isOwner = cafeData && address
    ? cafeData[0].toLowerCase() === address.toLowerCase()
    : null;

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

  function handleSelectSession(session: PaymentSessionRow) {
    setCustomerAddress(session.customer_address);
  }

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
        args: [DEFAULT_CAFE_ID, customerAddress as `0x${string}`, BigInt(earnedPoints)],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      await logTransaction({
        cafe_id: String(DEFAULT_CAFE_ID),
        cafe_name: CAFE_NAME,
        customer_address: customerAddress,
        type: "earn",
        points: earnedPoints,
        idr_amount: bill,
        tx_hash: hash,
      });
      const selectedSession = pendingSessions.find(
        (session) => session.customer_address.toLowerCase() === customerAddress.toLowerCase()
      );
      if (selectedSession) {
        await updatePaymentSession(selectedSession.id, {
          status: "completed",
          bill_amount: bill,
          mint_tx_hash: hash,
        });
      }
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
          <p className="text-brown/60 text-sm mt-1">+{mintedPoints} poin to {customerAddress.slice(0, 8)}...</p>
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
        <p className="text-cream/60 text-xs ml-11">Show merchant QR and mint points after payment</p>
      </div>

      <div className="px-5 py-6 flex flex-col gap-4">
        {isConnected && isOwner === false && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
            <ShieldAlert size={20} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600">
              Wallet kamu bukan owner cafe ini. Hanya owner yang bisa mint poin.
            </p>
          </div>
        )}

        {!isConnected && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700">
            Connect wallet owner cafe untuk menggunakan mode kasir.
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
              <QrCode size={18} className="text-coffee" />
            </div>
            <div>
              <p className="text-sm font-semibold text-espresso">Merchant QR</p>
              <p className="text-xs text-brown/60">Customer scans this QR from the payment page.</p>
            </div>
          </div>

          <div className="w-56 h-56 mx-auto bg-white border-2 border-latte rounded-2xl p-3 shadow-card relative flex items-center justify-center overflow-hidden">
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

        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
              <Store size={18} className="text-coffee" />
            </div>
            <div>
              <p className="text-sm font-semibold text-espresso">Pending Customers</p>
              <p className="text-xs text-brown/60">Customers who scanned QR and tapped “I'm Paying”.</p>
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
              const active = session.customer_address.toLowerCase() === customerAddress.toLowerCase();
              return (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`w-full text-left rounded-2xl px-4 py-3 border transition-colors ${active ? "border-espresso bg-latte" : "border-cream bg-white"}`}
                >
                  <p className="text-sm font-semibold text-espresso font-mono">
                    {session.customer_address.slice(0, 10)}...{session.customer_address.slice(-4)}
                  </p>
                  <p className="text-2xs text-mocha mt-1">
                    {new Date(session.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-latte flex items-center justify-center">
              <Store size={18} className="text-coffee" />
            </div>
            <div>
              <p className="text-sm font-semibold text-espresso">Mint Customer Points</p>
              <p className="text-xs text-brown/60">After payment, mint loyalty points to the customer's wallet.</p>
            </div>
          </div>

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
            <p className="text-xs text-green-600 mt-1 font-medium">Wallet valid</p>
          )}
        </div>

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

        {bill > 0 && validAddress && (
          <div className="bg-latte rounded-2xl p-5 border border-cream">
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
            <div className="border-t border-cream/60 pt-2 flex justify-between">
              <span className="font-semibold text-espresso">Poin diberikan</span>
              <span className="font-bold text-green-600">+{earnedPoints}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleMint}
          disabled={isPending || !validAddress || bill === 0 || isOwner === false || !isConnected}
          className="bg-espresso text-white rounded-2xl py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={18} className="animate-spin" />}
          {isPending ? "Memproses..." : "Berikan Poin"}
        </button>
      </div>
    </div>
  );
}
