"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ChevronLeft, TrendingUp, TrendingDown, Gift, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";
import { getTransactions, type TransactionRow, type TxType } from "@/lib/supabase";

const TX_META: Record<TxType, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  earn:        { label: "Dapat Poin",   color: "text-green-600",  bg: "bg-green-50",  Icon: TrendingUp  },
  redeem:      { label: "Tukar Poin",   color: "text-orange-500", bg: "bg-orange-50", Icon: TrendingDown },
  voucher_buy: { label: "Beli Voucher", color: "text-purple-600", bg: "bg-purple-50", Icon: Gift        },
  refund:      { label: "Refund MON",   color: "text-blue-600",   bg: "bg-blue-50",   Icon: RotateCcw   },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [txs, setTxs] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    getTransactions(address)
      .then(setTxs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-espresso text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="font-semibold">Riwayat Transaksi</h1>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-3">
        {!isConnected && (
          <p className="text-center text-brown/50 text-sm py-10">Connect wallet untuk melihat riwayat.</p>
        )}

        {isConnected && loading && (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-mocha" />
          </div>
        )}

        {isConnected && !loading && txs.length === 0 && (
          <p className="text-center text-brown/50 text-sm py-10">Belum ada transaksi.</p>
        )}

        {txs.map((tx) => {
          const { label, color, bg, Icon } = TX_META[tx.type];
          return (
            <a
              key={tx.id}
              href={`https://explorer.monad.xyz/tx/${tx.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-cream"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-espresso">{tx.cafe_name}</p>
                  <p className="text-xs text-brown/60">{label} · {formatDate(tx.created_at)}</p>
                  <p className="text-xs text-brown/50">
                    Rp {tx.idr_amount.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-bold ${tx.points > 0 ? "text-green-600" : "text-orange-500"}`}>
                {tx.points > 0 ? "+" : ""}{tx.points}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
