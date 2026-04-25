"use client";

import { useAccount, useReadContract } from "wagmi";
import { KOPILOYALTY_ABI, KOPILOYALTY_ADDRESS, DEFAULT_CAFE_ID } from "@/lib/contract";
import { OPERATOR_ADDRESS } from "@/lib/operator";

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
  const isOwner = Boolean(address && address.toLowerCase() === OPERATOR_ADDRESS.toLowerCase());

  return {
    address,
    isConnected,
    isOwner,
    ownerAddress,
    operatorAddress: OPERATOR_ADDRESS,
    isLoading,
    refetch,
  };
}
