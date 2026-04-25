"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { CAFE_NAME, CAFE_LOCATION } from "@/lib/cafeConfig";
import { useCafePoints } from "@/hooks/useCafePoints";
import { getTransactions, type TransactionRow } from "@/lib/supabase";
import {
  Bell, MapPin, QrCode, ChevronRight,
  TrendingUp, TrendingDown, Coins, Loader2, Star
} from "lucide-react";
import Link from "next/link";

const DEMO_CAFES = [
  { id: 1, name: "Kopi Tugu Jogja", location: "Malioboro", dist: "140 m", rating: 4.8, color: "from-[#4a2c1a] to-[#8B5E3C]" },
  { id: 2, name: "Filosofi Kopi",   location: "Melawai",   dist: "350 m", rating: 4.7, color: "from-[#1a3a2c] to-[#2E7D32]" },
  { id: 3, name: "Epic Coffee",     location: "Senopati",  dist: "650 m", rating: 4.6, color: "from-[#1a1a3a] to-[#3a3a6a]" },
];

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { balance, isLoading: pointsLoading, isError: pointsError } = useCafePoints(
    address as `0x${string}` | undefined
  );

  const [recentTxs, setRecentTxs] = useState<TransactionRow[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [todayEarned, setTodayEarned] = useState(0);

  useEffect(() => {
    if (!address) return;
    setTxLoading(true);
    getTransactions(address)
      .then((rows) => {
        setRecentTxs(rows.slice(0, 4));
        const today = new Date().toDateString();
        const earned = rows
          .filter(r => r.type === "earn" && new Date(r.created_at).toDateString() === today)
          .reduce((sum, r) => sum + r.points, 0);
        setTodayEarned(earned);
      })
      .catch(console.error)
      .finally(() => setTxLoading(false));
  }, [address]);

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-latte-light">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-espresso flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-base">
              {address ? address.slice(2, 4).toUpperCase() : "KL"}
            </span>
          </div>
          <div>
            <p className="text-xs text-mocha font-medium">
              {isConnected ? `Hi, ${shortAddr}` : "Hi there"}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-espresso">{CAFE_NAME}</p>
              <ChevronRight size={12} className="text-mocha" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="text-mocha" />
              <p className="text-2xs text-mocha">{CAFE_LOCATION}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-full bg-latte flex items-center justify-center">
            <Bell size={18} className="text-coffee" />
          </button>
          {!isConnected && <ConnectButton />}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-5">
        {/* ── Points Hero Card ── */}
        <div className="bg-espresso rounded-3xl p-5 shadow-hero relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -right-8 bottom-0 w-40 h-40 rounded-full bg-white/5" />

          <p className="text-cream/70 text-xs font-medium mb-2">Your Loyalty Points</p>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {pointsLoading ? (
                  <Loader2 size={24} className="animate-spin text-cream/60" />
                ) : pointsError || !isConnected ? (
                  <span className="text-4xl font-bold text-white/30">--</span>
                ) : (
                  <span className="text-4xl font-bold text-white tracking-tight">
                    {(balance ?? 0).toLocaleString("id-ID")}
                  </span>
                )}
                {!pointsLoading && !pointsError && isConnected && (
                  <Coins size={20} className="text-gold mb-1" />
                )}
              </div>

              {todayEarned > 0 && (
                <div className="inline-flex items-center gap-1 bg-earn-green/20 px-2.5 py-1 rounded-full">
                  <TrendingUp size={11} className="text-green-300" />
                  <span className="text-green-300 text-2xs font-semibold">
                    +{todayEarned} points earned today
                  </span>
                </div>
              )}
              {!isConnected && (
                <div className="mt-2">
                  <ConnectButton />
                </div>
              )}
            </div>

            {/* Latte art illustration area */}
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Coins size={36} className="text-gold" />
            </div>
          </div>
        </div>

        {/* ── Pay with QR Banner ── */}
        <Link
          href="/payment"
          className="bg-coffee rounded-2xl px-5 py-4 flex items-center justify-between shadow-card active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <QrCode size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Pay with QR</p>
              <p className="text-cream/70 text-2xs">Earn points on every purchase</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-white/60" />
        </Link>

        {/* ── Nearby Cafes ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-espresso">Nearby Cafes</h2>
            <button className="text-coffee text-sm font-medium">See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {DEMO_CAFES.map((cafe) => (
              <div
                key={cafe.id}
                className="shrink-0 w-32 rounded-2xl overflow-hidden shadow-card bg-white"
              >
                {/* Cafe image placeholder */}
                <div className={`h-24 bg-gradient-to-br ${cafe.color} flex items-center justify-center`}>
                  <span className="text-white/30 text-2xs font-medium">cafe photo</span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-espresso leading-tight">{cafe.name}</p>
                  <p className="text-2xs text-mocha mt-0.5">{cafe.dist}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={10} className="text-gold fill-gold" />
                    <span className="text-2xs font-semibold text-coffee">{cafe.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent Transactions ── */}
        <section className="pb-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-espresso">Recent Transactions</h2>
            <Link href="/history" className="text-coffee text-sm font-medium">See all</Link>
          </div>

          {!isConnected && (
            <div className="bg-white rounded-2xl p-5 text-center shadow-card">
              <p className="text-mocha text-sm">Connect your wallet to see transactions.</p>
            </div>
          )}

          {isConnected && txLoading && (
            <div className="flex justify-center py-8">
              <Loader2 size={22} className="animate-spin text-coffee" />
            </div>
          )}

          {isConnected && !txLoading && recentTxs.length === 0 && (
            <div className="bg-white rounded-2xl p-5 text-center shadow-card">
              <p className="text-mocha text-sm">No transactions yet.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {recentTxs.map((tx) => {
              const isEarn = tx.points > 0;
              return (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEarn ? "bg-earn-light" : "bg-orange-50"}`}>
                      {isEarn
                        ? <TrendingUp size={16} className="text-earn-green" />
                        : <TrendingDown size={16} className="text-orange-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-espresso">{tx.cafe_name}</p>
                      <p className="text-2xs text-mocha mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}, {new Date(tx.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}Rp {tx.idr_amount.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold ${isEarn ? "text-earn-green" : "text-orange-500"}`}>
                        {isEarn ? "+" : ""}{tx.points}
                      </span>
                      <Coins size={13} className="text-gold" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
