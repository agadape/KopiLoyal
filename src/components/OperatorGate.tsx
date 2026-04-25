"use client";

import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { ConnectButton } from "@/components/ConnectButton";

type OperatorGateProps = {
  isConnected: boolean;
  isLoading: boolean;
  isOwner: boolean;
  operatorAddress?: string;
  ownerAddress?: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function OperatorGate({
  isConnected,
  isLoading,
  isOwner,
  operatorAddress,
  ownerAddress,
  title,
  description,
  children,
}: OperatorGateProps) {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-card p-6 text-center">
          <Loader2 size={22} className="animate-spin text-coffee mx-auto mb-3" />
          <p className="text-sm font-semibold text-espresso">Checking operator access...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-card p-6 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-latte flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={20} className="text-coffee" />
          </div>
          <h1 className="text-lg font-bold text-espresso">{title}</h1>
          <p className="text-sm text-mocha mt-2 mb-4">{description}</p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-card p-6 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={20} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-espresso">Access Restricted</h1>
          <p className="text-sm text-mocha mt-2">
            Hanya wallet owner cafe yang bisa membuka mode operator ini.
          </p>
          {ownerAddress && (
            <p className="text-xs text-mocha/70 mt-3 font-mono">
              Owner: {ownerAddress.slice(0, 10)}...{ownerAddress.slice(-6)}
            </p>
          )}
          {operatorAddress && (
            <p className="text-xs text-mocha/70 mt-1 font-mono">
              Allowed: {operatorAddress.slice(0, 10)}...{operatorAddress.slice(-6)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
