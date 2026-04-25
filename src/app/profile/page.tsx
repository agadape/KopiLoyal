"use client";

import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { useCafePoints } from "@/hooks/useCafePoints";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, CAFE_ID } from "@/lib/cafeConfig";
import { useReadContract } from "wagmi";
import { ChevronLeft, Coffee, Shield, LogOut, Copy, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const BADGE_TIERS = [
  { name: "Bronze", visits: 10,  emoji: "B", color: "bg-amber-100 text-amber-700"   },
  { name: "Silver", visits: 50,  emoji: "S", color: "bg-gray-100 text-gray-600"     },
  { name: "Gold",   visits: 100, emoji: "G", color: "bg-yellow-100 text-yellow-700" },
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
  const nextBadge = BADGE_TIERS.find((b) => visits < b.visits);
  const progressToNext = nextBadge ? (visits / nextBadge.visits) * 100 : 100;

  function copyAddress() {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Alamat wallet disalin!");
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-espresso text-white px-5 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="font-semibold">Profil</h1>
        </div>

        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full bg-mocha flex items-center justify-center">
            <Coffee size={28} className="text-white" />
          </div>
          {isConnected && address ? (
            <button onClick={copyAddress} className="flex items-center gap-1.5 text-cream/80 text-xs">
              <span className="font-mono">{address.slice(0, 8)}...{address.slice(-6)}</span>
              <Copy size={11} />
            </button>
          ) : (
            <p className="text-cream/70 text-sm">Belum connect wallet</p>
          )}
          <ConnectButton />
          {isConnected && (
            <div className="mt-1 text-cream/70 text-xs">
              {pointsLoading
                ? "Memuat poin..."
                : `${(balance ?? 0).toLocaleString("id-ID")} poin`}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-5">
        {/* Badge progress */}
        <div className="bg-white rounded-2xl p-5 border border-cream shadow-sm">
          <h3 className="font-semibold text-sm text-espresso mb-4">Badge Loyalitas</h3>
          {nextBadge && visits > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-brown/60 mb-1">
                <span>{visits} kunjungan</span>
                <span>{nextBadge.name} di {nextBadge.visits}x</span>
              </div>
              <div className="h-2 bg-cream rounded-full overflow-hidden">
                <div className="h-full bg-espresso rounded-full transition-all" style={{ width: `${progressToNext}%` }} />
              </div>
            </div>
          )}
          {visits === 0 && isConnected && (
            <p className="text-xs text-brown/50 mb-3">Belum ada kunjungan tercatat.</p>
          )}
          <div className="flex gap-3">
            {BADGE_TIERS.map((badge, i) => {
              const owned = (badges >> i) & 1;
              return (
                <div
                  key={badge.name}
                  className={`flex-1 rounded-xl p-3 text-center ${owned ? badge.color : "bg-cream/50 text-brown/30"}`}
                >
                  <div className="text-lg font-bold mb-1">{badge.emoji}</div>
                  <p className="text-xs font-semibold">{badge.name}</p>
                  <p className="text-xs opacity-70">{badge.visits}x</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Settings list */}
        <div className="bg-white rounded-2xl border border-cream shadow-sm overflow-hidden">
          <button
            onClick={() => toast.info("Segera hadir!")}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-cream hover:bg-latte transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-brown" />
              <span className="text-sm font-medium text-espresso">Keamanan</span>
            </div>
            <span className="text-xs text-brown/40">Segera</span>
          </button>
          <Link
            href="/admin"
            className="flex items-center justify-between px-5 py-4 hover:bg-latte transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-brown" />
              <span className="text-sm font-medium text-espresso">Admin / Kasir</span>
            </div>
            <span className="text-xs text-brown/40">Owner only</span>
          </Link>
        </div>

        {isConnected && (
          <button
            onClick={() => disconnect()}
            className="flex items-center justify-center gap-2 text-red-500 text-sm font-medium py-3 rounded-2xl border border-red-100 bg-red-50"
          >
            <LogOut size={16} />
            Disconnect Wallet
          </button>
        )}
      </div>
    </div>
  );
}
