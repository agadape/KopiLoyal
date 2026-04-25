export const MERCHANT_QR_VERSION = 1;

export type MerchantQrPayload = {
  type: "kopiloyalty-merchant";
  version: typeof MERCHANT_QR_VERSION;
  cafeId: number;
};

export function createMerchantQrPayload(cafeId: bigint): MerchantQrPayload {
  return {
    type: "kopiloyalty-merchant",
    version: MERCHANT_QR_VERSION,
    cafeId: Number(cafeId),
  };
}

export function serializeMerchantQrPayload(payload: MerchantQrPayload): string {
  return JSON.stringify(payload);
}

export function parseMerchantQrPayload(raw: string): MerchantQrPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<MerchantQrPayload>;
    if (parsed.type !== "kopiloyalty-merchant") return null;
    if (parsed.version !== MERCHANT_QR_VERSION) return null;
    if (typeof parsed.cafeId !== "number" || !Number.isInteger(parsed.cafeId)) return null;

    return {
      type: "kopiloyalty-merchant",
      version: MERCHANT_QR_VERSION,
      cafeId: parsed.cafeId,
    };
  } catch {
    return null;
  }
}
