"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { ChevronLeft, CheckCircle, Info, Coins, Loader2, Shield, MapPin, ScanLine, CameraOff } from "lucide-react";
import Link from "next/link";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, CAFE_ID, CAFE_NAME, CAFE_LOCATION, BURN_RATE_IDR } from "@/lib/cafeConfig";
import { parseContractError, KopiErrorCode } from "@/utils/contractErrors";
import { logTransaction } from "@/lib/supabase";
import { useCafePoints } from "@/hooks/useCafePoints";
import { parseMerchantQrPayload, type MerchantQrPayload } from "@/lib/merchantQr";

type ScannerState = "idle" | "starting" | "active";
type CameraHandle = { stop: () => void; readFrame: (canvas: unknown, fullSize?: boolean) => string | undefined };
type FrameCancel = () => void;

export default function PaymentPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraRef = useRef<CameraHandle | null>(null);
  const cancelLoopRef = useRef<FrameCancel | null>(null);

  const { balance: pointBalance, pointsTokenId, isLoading: pointsLoading } = useCafePoints(
    address as `0x${string}` | undefined
  );

  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [redeemedPoints, setRedeemedPoints] = useState(0);
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [merchantQr, setMerchantQr] = useState<MerchantQrPayload | null>(null);

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const maxPoints = pointBalance ?? 0;
  const discount = pointsToRedeem * BURN_RATE_IDR;
  const canRedeemForScannedCafe = merchantQr?.cafeId === Number(CAFE_ID);

  function stopScanner() {
    cancelLoopRef.current?.();
    cancelLoopRef.current = null;
    cameraRef.current?.stop();
    cameraRef.current = null;
    setScannerState("idle");
  }

  async function startScanner() {
    if (!videoRef.current) return;

    stopScanner();
    setScannerState("starting");
    setScannerError(null);

    try {
      const [{ QRCanvas, frontalCamera, frameLoop }] = await Promise.all([import("qr/dom.js")]);
      const camera = await frontalCamera(videoRef.current);
      const canvas = new QRCanvas();

      cameraRef.current = camera as CameraHandle;
      setScannerState("active");

      cancelLoopRef.current = frameLoop(() => {
        const raw = camera.readFrame(canvas);
        if (!raw) return;

        const payload = parseMerchantQrPayload(raw);
        if (!payload) return;

        setMerchantQr(payload);
        toast.success(`Scanned ${payload.cafeName}.`);
        stopScanner();
      });
    } catch (error) {
      console.error(error);
      setScannerState("idle");
      setScannerError("Camera access failed. You can try again.");
    }
  }

  function clearScan() {
    setMerchantQr(null);
    setUsePoints(false);
    setPointsToRedeem(0);
  }

  async function handleRedeem() {
    if (!isConnected || !address) { toast.error("Connect your wallet first."); return; }
    if (!merchantQr) { toast.error("Scan the merchant QR first."); return; }
    if (!canRedeemForScannedCafe) { toast.error("This QR is not for the configured cafe."); return; }
    if (pointsToRedeem === 0) { toast.error("Select points to redeem."); return; }
    if (pointsTokenId === undefined) { toast.error("Cafe data not loaded. Try again."); return; }

    setIsPending(true);
    try {
      await publicClient!.simulateContract({
        address: KOPILOYALTY_ADDRESS,
        abi: KOPILOYALTY_ABI,
        functionName: "redeemPoints",
        args: [CAFE_ID, BigInt(pointsToRedeem)],
        account: address,
      });
      const hash = await writeContractAsync({
        address: KOPILOYALTY_ADDRESS,
        abi: KOPILOYALTY_ABI,
        functionName: "redeemPoints",
        args: [CAFE_ID, BigInt(pointsToRedeem)],
      });
      setRedeemedPoints(pointsToRedeem);
      setTxHash(hash);
      toast.success(`${pointsToRedeem} points redeemed!`);
      try {
        await logTransaction({
          cafe_id: String(CAFE_ID),
          cafe_name: CAFE_NAME,
          customer_address: address,
          type: "redeem",
          points: -pointsToRedeem,
          idr_amount: discount,
          tx_hash: hash,
        });
      } catch {
        toast.warning("Transaction saved, but history sync failed.");
      }
    } catch (err) {
      const e = parseContractError(err);
      if (e.code !== KopiErrorCode.USER_REJECTED) toast.error(e.userMessage);
    } finally {
      setIsPending(false);
    }
  }

  if (txHash) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6 bg-latte-light">
        <div className="w-24 h-24 bg-earn-light rounded-full flex items-center justify-center shadow-card">
          <CheckCircle size={44} className="text-earn-green" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-espresso">Points Redeemed!</h2>
          <p className="text-mocha text-sm mt-1">
            -{redeemedPoints} pts saved Rp {(redeemedPoints * BURN_RATE_IDR).toLocaleString("id-ID")}
          </p>
        </div>
        <a
          href={`https://explorer.monad.xyz/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-coffee font-mono underline underline-offset-2 break-all px-4"
        >
          {txHash.slice(0, 20)}...{txHash.slice(-8)}
        </a>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => { setTxHash(null); clearScan(); }}
            className="flex-1 bg-espresso text-white py-3.5 rounded-2xl font-semibold text-sm"
          >
            Done
          </button>
          <Link href="/history" className="flex-1 bg-latte text-espresso py-3.5 rounded-2xl font-semibold text-sm text-center">
            History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-latte-light">
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3">
        <Link href="/" className="w-9 h-9 rounded-full bg-latte flex items-center justify-center">
          <ChevronLeft size={20} className="text-coffee" />
        </Link>
        <h1 className="font-semibold text-espresso text-base">Scan to Pay</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4 pb-24">
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-espresso">Scan Merchant QR</p>
              <p className="text-xs text-mocha mt-1">Scan the QR shown by the cafe owner or cashier.</p>
            </div>
            {scannerState === "active" ? (
              <button
                onClick={stopScanner}
                className="shrink-0 px-3 py-2 rounded-xl bg-latte text-espresso text-xs font-semibold"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={startScanner}
                className="shrink-0 px-3 py-2 rounded-xl bg-espresso text-white text-xs font-semibold flex items-center gap-2"
              >
                {scannerState === "starting" ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
                {scannerState === "starting" ? "Starting..." : "Scan"}
              </button>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden bg-neutral-950 aspect-square flex items-center justify-center">
            {scannerState === "idle" && (
              <div className="text-center px-6">
                <CameraOff size={22} className="text-white/70 mx-auto mb-2" />
                <p className="text-xs text-white/80">Open the camera and point it at the merchant QR.</p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${scannerState === "idle" ? "hidden" : "block"}`}
            />
          </div>

          {scannerError && (
            <p className="text-xs text-red-500 mt-2">{scannerError}</p>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="w-16 h-16 rounded-full bg-espresso flex items-center justify-center mx-auto mb-3 shadow-hero">
            <span className="text-white font-bold text-lg">KT</span>
          </div>

          {merchantQr ? (
            <div className="text-center">
              <p className="font-bold text-espresso text-lg">{merchantQr.cafeName}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <MapPin size={11} className="text-mocha" />
                <p className="text-xs text-mocha">{merchantQr.location ?? "Merchant QR scanned"}</p>
              </div>
              <p className="text-2xs text-mocha/70 mt-3">Cafe ID {merchantQr.cafeId}</p>
              <button
                onClick={clearScan}
                className="mt-4 text-xs text-coffee font-semibold"
              >
                Scan another QR
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-semibold text-espresso text-base">No merchant scanned yet</p>
              <p className="text-xs text-mocha mt-2">Scan first, then use points for the scanned cafe.</p>
            </div>
          )}
        </div>

        <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-4 flex items-start gap-3">
          <Info size={15} className="text-[#F9A825] mt-0.5 shrink-0" />
          <p className="text-xs text-[#7B6000] leading-relaxed">
            <span className="font-semibold">Flow revision applied.</span>
            {" "}Customers now scan the merchant QR. The merchant QR identifies the cafe, then this screen handles any point redemption.
          </p>
        </div>

        {isConnected && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-card">
            <p className="text-xs text-mocha font-medium mb-0.5">Your Balance</p>
            {pointsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-coffee" />
                <span className="text-sm text-mocha">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-espresso">{maxPoints.toLocaleString("id-ID")}</span>
                <Coins size={18} className="text-gold" />
                <span className="text-sm text-mocha">points</span>
              </div>
            )}
          </div>
        )}

        {merchantQr && (
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-espresso">Use Points Now</p>
              <button
                onClick={() => { setUsePoints(!usePoints); setPointsToRedeem(0); }}
                disabled={!canRedeemForScannedCafe}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${usePoints ? "bg-espresso" : "bg-cream"} disabled:opacity-50`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${usePoints ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>

            {!canRedeemForScannedCafe && (
              <p className="text-xs text-red-500 mb-3">
                This QR is for cafe #{merchantQr.cafeId}, but the app is currently configured for cafe #{String(CAFE_ID)}.
              </p>
            )}

            {usePoints && canRedeemForScannedCafe && (
              <div className="mt-1">
                <input
                  type="range"
                  min={0}
                  max={maxPoints}
                  step={Math.max(1, Math.floor(maxPoints / 20))}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, #2E7D32 ${(pointsToRedeem / maxPoints) * 100}%, #EDD9C0 0%)`
                  }}
                />
                <div className="flex justify-between text-2xs text-mocha mt-2">
                  <span>0</span>
                  <span className="font-semibold text-espresso">{pointsToRedeem.toLocaleString("id-ID")} pts</span>
                  <span>{maxPoints.toLocaleString("id-ID")}</span>
                </div>
                {pointsToRedeem > 0 && (
                  <div className="mt-3 bg-earn-light rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-earn-green font-medium">You save</span>
                    <span className="text-sm font-bold text-earn-green">Rp {discount.toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {usePoints && canRedeemForScannedCafe && pointsToRedeem > 0 && (
          <button
            onClick={handleRedeem}
            disabled={isPending}
            className="w-full bg-espresso text-white rounded-2xl py-4 font-semibold text-sm shadow-float disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {isPending && <Loader2 size={18} className="animate-spin" />}
            {isPending ? "Processing..." : `Redeem ${pointsToRedeem.toLocaleString("id-ID")} Points`}
          </button>
        )}

        <div className="flex items-center justify-center gap-2 py-2">
          <Shield size={12} className="text-mocha/60" />
          <p className="text-2xs text-mocha/60">Secure payment powered by KopiLoyalty</p>
        </div>
      </div>
    </div>
  );
}
