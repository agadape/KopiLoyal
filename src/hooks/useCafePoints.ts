"use client";

import { useReadContract } from "wagmi";
import { KOPILOYALTY_ADDRESS, KOPILOYALTY_ABI, CAFE_ID } from "@/lib/cafeConfig";

export function useCafePoints(address?: `0x${string}`) {
  const { data: cafeData, isLoading: cafeLoading, isError: cafeError } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "getCafe",
    args: [CAFE_ID],
  });

  // getCafe returns tuple: [owner, depositAmount, pointsTokenId, mintedPoints, circulatingPoints, lastActivity]
  const pointsTokenId = cafeData?.[2];

  const { data: balance, isLoading: balanceLoading, isError: balanceError } = useReadContract({
    address: KOPILOYALTY_ADDRESS,
    abi: KOPILOYALTY_ABI,
    functionName: "balanceOf",
    args: address && pointsTokenId !== undefined ? [address, pointsTokenId] : undefined,
    query: { enabled: !!address && pointsTokenId !== undefined },
  });

  return {
    balance: balance !== undefined ? Number(balance) : null,
    pointsTokenId,
    cafeData,
    isLoading: cafeLoading || (!!address && balanceLoading),
    isError: cafeError || balanceError,
  };
}
