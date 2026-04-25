"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ChevronLeft, TrendingUp, TrendingDown, Gift, RotateCcw, Loader2, SlidersHorizontal, Coins } from "lucide-react";
import Link from "next/link";
import { getTransactions, type TransactionRow, type TxType } from "@/lib/supabase";
import clsx from "clsx";

const FILTERS = [
  { key: "all",    label: "All"    },
  { key: "earn",   label: "Earn"   },
  { key: "redeem", label: "Redeem" },
] as const;

const TX_META: Record<TxType, { Icon: React.ElementType; iconColor: string; iconBg: string }> = {
  earn:        { Icon: TrendingUp,  iconColor: "text-earn-green",  iconBg: "bg-earn-light"  },
  redeem:      { Icon: TrendingDown,iconColor: "text-orange-500", iconBg: "bg-orange-50"   },
  voucher_buy: { Icon: Gift,        iconColor: "text-purple-600", iconBg: "bg-purple-50"   },
  refund:      { Icon: RotateCcw,   iconColor: "text-blue-600",   iconBg: "bg-blue-50"     },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [txs, setTxs] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "earn" | "redeem">("all");

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    getTransactions(address)
      .then(setTxs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  const filtered = filter === "all" ? txs : txs.filter(t => t.type === filter);

  return (
    <div className="flex flex-col min-h-screen bg-latte-light">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 rounded-full bg-latte flex items-center justify-center">
            <ChevronLeft size={20} className="text-coffee" />
          </Link>
          <h1 className="font-semibold text-espresso text-base">Transaction History</h1>
        </div>
        <button className="w-9 h-9 rounded-full bg-latte flex items-center justify-center">
          <SlidersHorizontal size={16} className="text-coffee" />
        </button>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="bg-white px-5 pb-4">
        <div className="flex gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={clsx(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                filter === key
                  ? "bg-espresso text-white"
                  : "bg-latte text-mocha hover:bg-cream"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2.5 pb-24">
        {/* Not connected */}
        {!isConnected && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-card mt-2">
            <p className="text-mocha text-sm">Connect your wallet to see history.</p>
          </div>
        )}

        {/* Loading */}
        {isConnected && loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-coffee" />
          </div>
        )}

        {/* Empty */}
        {isConnected && !loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-card mt-2">
            <p className="text-mocha text-sm">No transactions found.</p>
          </div>
        )}

        {/* List */}
        {filtered.map((tx) => {
          const { Icon, iconColor, iconBg } = TX_META[tx.type] ?? TX_META.earn;
          const isPositive = tx.points > 0;
          return (
            <a
              key={tx.id}
              href={`https://explorer.monad.xyz/tx/${tx.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl px-4 py-4 flex items-center justify-between shadow-card active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                  <Icon size={18} className={iconColor} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-espresso">{tx.cafe_name}</p>
                  <p className="text-2xs text-mocha mt-0.5">{formatDate(tx.created_at)}</p>
                  <p className="text-2xs text-mocha/70 mt-0.5">
                    Rp {tx.idr_amount.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <span className={`text-sm font-bold ${isPositive ? "text-earn-green" : "text-orange-500"}`}>
                    {isPositive ? "+" : ""}{tx.points}
                  </span>
                  <Coins size={13} className="text-gold" />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
