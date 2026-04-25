"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showPicker, setShowPicker] = useState(false);

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="text-xs bg-cream text-espresso px-3 py-1.5 rounded-full font-medium"
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  if (connectors.length === 1) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        className="text-xs bg-espresso text-white px-3 py-1.5 rounded-full font-medium"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker((v) => !v)}
        className="text-xs bg-espresso text-white px-3 py-1.5 rounded-full font-medium"
      >
        Connect Wallet
      </button>
      {showPicker && (
        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-cream p-2 flex flex-col gap-1 z-50 min-w-[160px]">
          {connectors.map((c) => (
            <button
              key={c.id}
              onClick={() => { connect({ connector: c }); setShowPicker(false); }}
              className="text-left text-sm px-3 py-2 rounded-lg hover:bg-latte text-espresso font-medium"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
