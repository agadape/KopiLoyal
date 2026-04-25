"use client";

import { useAccount, useReadContract } from "wagmi";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, DEFAULT_CAFE_ID } from "@/lib/contract";

export function useOperatorAccess() {
  const { address, isConnected } = useAccount();

  const { data: cafeData, isLoading, refetch } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "getCafe",
    args: [DEFAULT_CAFE_ID],
    query: { enabled: true },
  });

  const ownerAddress = cafeData?.[0];
  const isOwner = Boolean(
    address &&
    ownerAddress &&
    ownerAddress.toLowerCase() === address.toLowerCase()
  );

  return {
    address,
    isConnected,
    isOwner,
    ownerAddress,
    isLoading,
    refetch,
  };
}
