"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { useCafePoints } from "@/hooks/useCafePoints";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, CAFE_ID, CAFE_NAME } from "@/lib/cafeConfig";
import { getUserProfile, uploadAvatar, upsertUserProfile } from "@/lib/supabase";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";
import {
  Camera, ChevronRight, Copy, LogOut, Coins, Loader2,
  User, Store, Wallet, HelpCircle, Info, ShieldCheck, RotateCcw
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { keccak256, encodePacked, toHex } from "viem";

const BADGE_TIERS = [
  { name: "Bronze", visits: 10, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { name: "Silver", visits: 50, color: "bg-gray-100 text-gray-600 border-gray-200" },
  { name: "Gold", visits: 100, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
];

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { balance, pointsTokenId, isLoading: pointsLoading } = useCafePoints(address as `0x${string}` | undefined);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClaimingRefund, setIsClaimingRefund] = useState(false);

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

  const { data: refundClaimable } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "isRefundClaimable",
    args: [CAFE_ID],
    query: { enabled: isConnected && !!address && !!pointsTokenId },
  });

  const badges = claimedBadges ? Number(claimedBadges) : 0;

  const canClaimRefund = Boolean(refundClaimable && balance && balance > 0);

  function getBadgeTokenId(tier: number) {
    const padded = toHex("KL_BADGE", { size: 32 });
    return keccak256(encodePacked(["bytes32", "uint256", "uint8"], [padded, CAFE_ID, tier]));
  }

  const badgeBalances = [
    { owned: Boolean((badges >> 0) & 1), tokenId: getBadgeTokenId(0) },
    { owned: Boolean((badges >> 1) & 1), tokenId: getBadgeTokenId(1) },
    { owned: Boolean((badges >> 2) & 1), tokenId: getBadgeTokenId(2) },
  ];

  async function handleClaimRefund() {
    if (!isConnected || !address) { toast.error("Connect wallet dulu."); return; }
    setIsClaimingRefund(true);
    try {
      const hash = await writeContractAsync({
        address: KOPILOYALTY_ADDRESS,
        abi: KOPILOYALTY_ABI,
        functionName: "claimRefund",
        args: [CAFE_ID],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      toast.success("Refund berhasil diklaim!");
    } catch (err) {
      const e = parseContractError(err);
      if (e.code !== KopiErrorCode.USER_REJECTED) toast.error(e.userMessage);
    } finally {
      setIsClaimingRefund(false);
    }
  }

  useEffect(() => {
    if (!address) {
      setDisplayName("");
      setAvatarUrl(null);
      setAvatarFile(null);
      return;
    }

    setProfileLoading(true);
    getUserProfile(address)
      .then((profile) => {
        setDisplayName(profile?.display_name ?? "");
        setAvatarUrl(profile?.avatar_url ?? null);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to load your profile.");
      })
      .finally(() => setProfileLoading(false));
  }, [address]);

  const visits = visitCount ? Number(visitCount) : 0;
  const badges = claimedBadges ? Number(claimedBadges) : 0;

  function getBadgeTokenId(tier: number) {
    const padded = toHex("KL_BADGE", { size: 32 });
    return keccak256(encodePacked(["bytes32", "uint256", "uint8"], [padded, CAFE_ID, tier]));
  }

  const badgeBalances = [
    { owned: Boolean((badges >> 0) & 1), tokenId: getBadgeTokenId(0) },
    { owned: Boolean((badges >> 1) & 1), tokenId: getBadgeTokenId(1) },
    { owned: Boolean((badges >> 2) & 1), tokenId: getBadgeTokenId(2) },
  ];

  const nextBadge = BADGE_TIERS.find((badge) => visits < badge.visits);
  const progress = nextBadge ? Math.round((visits / nextBadge.visits) * 100) : 100;
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const visibleName = displayName.trim() || shortAddress;

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success("Wallet address copied!");
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  }

  async function handleSaveProfile() {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error("Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const nextAvatarUrl = avatarFile ? await uploadAvatar(address, avatarFile) : avatarUrl;
      await upsertUserProfile({
        wallet_address: address,
        display_name: trimmedName,
        avatar_url: nextAvatarUrl ?? null,
      });

      setDisplayName(trimmedName);
      setAvatarUrl(nextAvatarUrl ?? null);
      setAvatarFile(null);
      toast.success("Profile updated.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  const SETTINGS = [
    { icon: Store, label: "Switch Cafe", right: CAFE_NAME, action: () => toast.info("Coming soon!") },
    { icon: Wallet, label: "Wallet", right: "Connected", rightColor: "text-earn-green", action: () => {} },
    { icon: HelpCircle, label: "Help & Support", right: null, action: () => toast.info("Coming soon!") },
    { icon: Info, label: "About KopiLoyalty", right: null, action: () => toast.info("Coming soon!") },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-latte-light">
      <div className="bg-white px-5 pt-12 pb-6 text-center">
        <h1 className="font-semibold text-espresso text-base mb-5">Profile</h1>

        <div className="relative w-20 h-20 mx-auto mb-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile avatar"
              className="w-20 h-20 rounded-full object-cover shadow-hero"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-espresso flex items-center justify-center shadow-hero">
              <span className="text-white font-bold text-2xl">
                {address ? address.slice(2, 4).toUpperCase() : "?"}
              </span>
            </div>
          )}

          {isConnected && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-cream shadow-card flex items-center justify-center"
                aria-label="Change profile picture"
              >
                <Camera size={14} className="text-coffee" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </>
          )}
        </div>

        {isConnected && address ? (
          <>
            <p className="font-bold text-espresso text-lg">
              {profileLoading ? "Loading..." : visibleName}
            </p>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1.5 text-mocha text-xs mx-auto mt-1.5 hover:text-coffee transition-colors"
            >
              <span className="font-mono">{address.slice(0, 10)}...{address.slice(-6)}</span>
              <Copy size={12} />
            </button>

            <div className="inline-flex items-center gap-1.5 bg-latte rounded-full px-3 py-1.5 mt-3">
              {pointsLoading ? (
                <Loader2 size={14} className="animate-spin text-coffee" />
              ) : (
                <span className="font-bold text-espresso text-sm">{(balance ?? 0).toLocaleString("id-ID")}</span>
              )}
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
        {isConnected && (
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-latte flex items-center justify-center">
                <User size={15} className="text-coffee" />
              </div>
              <p className="text-sm font-semibold text-espresso">Personalize Profile</p>
            </div>

            <label className="text-xs text-mocha font-medium mb-2 block">Display Name</label>
            <input
              type="text"
              maxLength={32}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl border border-cream px-4 py-3 text-sm text-espresso outline-none focus:border-mocha"
            />

            <p className="text-2xs text-mocha/70 mt-2">
              This name will replace the short wallet address on the home screen.
            </p>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving || profileLoading}
              className="mt-4 w-full bg-espresso text-white rounded-2xl py-3.5 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}

        {isConnected && canClaimRefund && (
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <RotateCcw size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-espresso mb-1">Klaim Refund</p>
                <p className="text-xs text-mocha/70 mb-3">
                  Anda punya <span className="font-semibold text-espresso">{(balance ?? 0).toLocaleString("id-ID")}</span> poin.
                  Tukar jadi MON sebelum cafe ditutup.
                </p>
                <button
                  onClick={handleClaimRefund}
                  disabled={isClaimingRefund}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 transition-colors w-full justify-center"
                >
                  {isClaimingRefund
                    ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                    : <><RotateCcw size={14} /> Klaim Sekarang</>}
                </button>
              </div>
            </div>
          </div>
        )}

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
              {BADGE_TIERS.map((badge, index) => {
                const { owned } = badgeBalances[index];
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

        <div className="bg-white rounded-3xl shadow-card overflow-hidden">
          {SETTINGS.map(({ icon: Icon, label, right, rightColor, action }, index) => (
            <button
              key={label}
              onClick={action}
              className={`w-full flex items-center justify-between px-5 py-4 hover:bg-latte/50 transition-colors text-left ${index < SETTINGS.length - 1 ? "border-b border-latte" : ""}`}
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
