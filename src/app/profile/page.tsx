"use client";

import { useAccount, useDisconnect, useReadContract } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { useCafePoints } from "@/hooks/useCafePoints";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, CAFE_ID, CAFE_NAME } from "@/lib/cafeConfig";
import {
  ChevronRight, Copy, LogOut, Coins, Loader2,
  User, Store, Wallet, HelpCircle, Info, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const BADGE_TIERS = [
  { name: "Bronze", visits: 10,  color: "bg-amber-100 text-amber-700 border-amber-200"  },
  { name: "Silver", visits: 50,  color: "bg-gray-100  text-gray-600  border-gray-200"   },
  { name: "Gold",   visits: 100, color: "bg-yellow-100 text-yellow-700 border-yellow-200"},
];

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { balance, isLoading: pointsLoading } = useCafePoints(address as `0x${string}` | undefined);

  const { data: visitCount } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "visitCounts",
    args: address ? [CAFE_ID, address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: claimedBadges } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "claimedBadges",
    args: address ? [CAFE_ID, address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const visits = visitCount ? Number(visitCount) : 0;
  const badges = claimedBadges ? Number(claimedBadges) : 0;
  const nextBadge = BADGE_TIERS.find(b => visits < b.visits);
  const progress = nextBadge ? Math.round((visits / nextBadge.visits) * 100) : 100;

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success("Wallet address copied!");
  }

  const SETTINGS = [
    { icon: User,       label: "Change Name",    right: null,         action: () => toast.info("Coming soon!") },
    { icon: Store,      label: "Switch Cafe",    right: CAFE_NAME,    action: () => toast.info("Coming soon!") },
    { icon: Wallet,     label: "Wallet",         right: "Connected",  rightColor: "text-earn-green", action: () => {} },
    { icon: HelpCircle, label: "Help & Support", right: null,         action: () => toast.info("Coming soon!") },
    { icon: Info,       label: "About KopiLoyalty", right: null,      action: () => toast.info("Coming soon!") },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-latte-light">
      {/* ── Header ── */}
      <div className="bg-white px-5 pt-12 pb-6 text-center">
        <h1 className="font-semibold text-espresso text-base mb-5">Profile</h1>

        {/* Avatar */}
        <div className="relative w-20 h-20 mx-auto mb-3">
          <div className="w-20 h-20 rounded-full bg-espresso flex items-center justify-center shadow-hero">
            <span className="text-white font-bold text-2xl">
              {address ? address.slice(2, 4).toUpperCase() : "?"}
            </span>
          </div>
        </div>

        {isConnected && address ? (
          <>
            <p className="font-bold text-espresso text-lg">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1.5 text-mocha text-xs mx-auto mt-1.5 hover:text-coffee transition-colors"
            >
              <span className="font-mono">{address.slice(0, 10)}...{address.slice(-6)}</span>
              <Copy size={12} />
            </button>

            {/* Points badge */}
            <div className="inline-flex items-center gap-1.5 bg-latte rounded-full px-3 py-1.5 mt-3">
              {pointsLoading
                ? <Loader2 size={14} className="animate-spin text-coffee" />
                : <span className="font-bold text-espresso text-sm">{(balance ?? 0).toLocaleString("id-ID")}</span>}
              <Coins size={14} className="text-gold" />
              <span className="text-xs text-mocha">points</span>
            </div>
          </>
        ) : (
          <div className="mt-2">
            <p className="text-mocha text-sm mb-3">Connect your wallet to get started</p>
            <ConnectButton />
          </div>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 pb-24">
        {/* ── Badge Progress ── */}
        {isConnected && (
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <p className="text-sm font-semibold text-espresso mb-4">Loyalty Badges</p>

            {nextBadge && visits > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-2xs text-mocha mb-1.5">
                  <span>{visits} visits</span>
                  <span>{nextBadge.name} at {nextBadge.visits}x</span>
                </div>
                <div className="h-2 bg-latte rounded-full overflow-hidden">
                  <div
                    className="h-full bg-espresso rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {visits === 0 && (
              <p className="text-xs text-mocha/60 mb-3">Start visiting to earn badges.</p>
            )}

            <div className="flex gap-2">
              {BADGE_TIERS.map((badge, i) => {
                const owned = Boolean((badges >> i) & 1);
                return (
                  <div
                    key={badge.name}
                    className={`flex-1 rounded-2xl p-3 text-center border ${owned ? badge.color : "bg-latte/50 text-mocha/40 border-transparent"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center mx-auto mb-1.5">
                      <ShieldCheck size={16} className={owned ? "" : "opacity-30"} />
                    </div>
                    <p className="text-2xs font-bold">{badge.name}</p>
                    <p className="text-2xs opacity-70 mt-0.5">{badge.visits}x</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Settings ── */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden">
          {SETTINGS.map(({ icon: Icon, label, right, rightColor, action }, i) => (
            <button
              key={label}
              onClick={action}
              className={`w-full flex items-center justify-between px-5 py-4 hover:bg-latte/50 transition-colors text-left ${i < SETTINGS.length - 1 ? "border-b border-latte" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-latte flex items-center justify-center">
                  <Icon size={15} className="text-coffee" />
                </div>
                <span className="text-sm font-medium text-espresso">{label}</span>
              </div>
              <div className="flex items-center gap-1">
                {right && (
                  <span className={`text-xs font-medium ${rightColor ?? "text-mocha"}`}>{right}</span>
                )}
                <ChevronRight size={15} className="text-mocha/50" />
              </div>
            </button>
          ))}
        </div>

        {/* Admin link */}
        <Link
          href="/admin"
          className="bg-white rounded-2xl shadow-card px-5 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-latte flex items-center justify-center">
              <ShieldCheck size={15} className="text-coffee" />
            </div>
            <span className="text-sm font-medium text-espresso">Admin / Cashier</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-mocha">Owner only</span>
            <ChevronRight size={15} className="text-mocha/50" />
          </div>
        </Link>

        {/* ── Disconnect ── */}
        {isConnected && (
          <button
            onClick={() => disconnect()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 bg-red-soft text-red-text text-sm font-semibold hover:bg-red-100 transition-colors active:scale-[0.98]"
          >
            <LogOut size={16} />
            Disconnect Wallet
          </button>
        )}
      </div>
    </div>
  );
}
