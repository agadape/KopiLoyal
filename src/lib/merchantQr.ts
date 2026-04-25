export const MERCHANT_QR_VERSION = 1;

export type MerchantQrPayload = {
  type: "kopiloyalty-merchant";
  version: typeof MERCHANT_QR_VERSION;
  cafeId: number;
  cafeName: string;
  location?: string;
};

export function createMerchantQrPayload(cafeId: bigint, cafeName: string, location?: string): MerchantQrPayload {
  return {
    type: "kopiloyalty-merchant",
    version: MERCHANT_QR_VERSION,
    cafeId: Number(cafeId),
    cafeName,
    location,
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
    if (typeof parsed.cafeName !== "string" || !parsed.cafeName.trim()) return null;
    if (parsed.location !== undefined && typeof parsed.location !== "string") return null;

    return {
      type: "kopiloyalty-merchant",
      version: MERCHANT_QR_VERSION,
      cafeId: parsed.cafeId,
      cafeName: parsed.cafeName,
      location: parsed.location,
    };
  } catch {
    return null;
  }
}
