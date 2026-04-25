"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { CAFE_NAME } from "@/lib/cafeConfig";
import { useCafePoints } from "@/hooks/useCafePoints";
import { getTransactions, type TransactionRow } from "@/lib/supabase";
import { Coffee, MapPin, ChevronRight, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import Link from "next/link";

const DEMO_CAFES = [
  { id: 1, name: CAFE_NAME, location: "Malioboro", note: "Cafe aktif" },
];

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { balance, isLoading: pointsLoading, isError: pointsError } = useCafePoints(
    address as `0x${string}` | undefined
  );

  const [recentTxs, setRecentTxs] = useState<TransactionRow[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setTxLoading(true);
    getTransactions(address)
      .then((rows) => setRecentTxs(rows.slice(0, 3)))
      .catch(console.error)
      .finally(() => setTxLoading(false));
  }, [address]);

  function renderPoints() {
    if (!isConnected) return <span className="text-cream/50 text-2xl">--</span>;
    if (pointsLoading) return <Loader2 size={28} className="animate-spin text-cream/60" />;
    if (pointsError || balance === null) return <span className="text-cream/50 text-2xl">-</span>;
    return <span className="text-4xl font-bold tracking-tight">{balance.toLocaleString("id-ID")}</span>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-espresso text-white px-5 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-mocha flex items-center justify-center">
              <Coffee size={20} className="text-white" />
            </div>
            <div>
              <p className="text-cream text-xs">Selamat datang,</p>
              <p className="font-semibold text-sm">
                {isConnected && address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : "Hubungkan Wallet"}
              </p>
            </div>
          </div>
          <ConnectButton />
        </div>

        {/* Points card */}
        <div className="bg-brown/40 rounded-2xl p-5">
          <p className="text-cream/80 text-xs mb-1">Total Poin Kamu</p>
          <div className="min-h-[44px] flex items-center">{renderPoints()}</div>
          {!pointsError && <p className="text-cream/60 text-xs mt-1">points</p>}
          {pointsError && (
            <p className="text-red-300 text-xs mt-1">Gagal memuat saldo dari kontrak</p>
          )}

          <Link
            href="/payment"
            className="mt-4 flex items-center justify-center gap-2 bg-mocha text-white rounded-xl py-3 text-sm font-semibold w-full"
          >
            <Coffee size={16} />
            Bayar &amp; Redeem Poin
          </Link>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6">
        {/* Cafe */}
        <section>
          <h2 className="font-semibold text-espresso mb-3">Cafe</h2>
          <div className="flex flex-col gap-3">
            {DEMO_CAFES.map((cafe) => (
              <div
                key={cafe.id}
                className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-cream"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-latte rounded-xl flex items-center justify-center">
                    <Coffee size={18} className="text-brown" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-espresso">{cafe.name}</p>
                    <div className="flex items-center gap-1 text-xs text-brown/60">
                      <MapPin size={11} />
                      {cafe.location}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-green-600 font-medium">{cafe.note}</span>
                  <ChevronRight size={14} className="text-brown/40 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-espresso">Transaksi Terakhir</h2>
            <Link href="/history" className="text-mocha text-xs font-medium">Lihat semua</Link>
          </div>

          {!isConnected && (
            <p className="text-brown/50 text-sm text-center py-4">Connect wallet untuk melihat riwayat.</p>
          )}

          {isConnected && txLoading && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-mocha" />
            </div>
          )}

          {isConnected && !txLoading && recentTxs.length === 0 && (
            <p className="text-brown/50 text-sm text-center py-4">Belum ada transaksi.</p>
          )}

          <div className="flex flex-col gap-2">
            {recentTxs.map((tx) => (
              <div
                key={tx.id}
                className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-cream"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.points > 0 ? "bg-green-50" : "bg-orange-50"}`}>
                    {tx.points > 0
                      ? <TrendingUp size={16} className="text-green-600" />
                      : <TrendingDown size={16} className="text-orange-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-espresso">{tx.cafe_name}</p>
                    <p className="text-xs text-brown/60">
                      {new Date(tx.created_at).toLocaleDateString("id-ID")} - Rp {tx.idr_amount.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.points > 0 ? "text-green-600" : "text-orange-500"}`}>
                  {tx.points > 0 ? "+" : ""}{tx.points}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
