export type KopiError = {
  code: string;
  userMessage: string;
  devMessage: string;
  raw?: unknown;
};

const CONTRACT_ERROR_MAP: Record<string, Omit<KopiError, "raw">> = {
  Unauthorized: {
    code: "UNAUTHORIZED",
    userMessage: "Kamu bukan pemilik cafe ini.",
    devMessage: "msg.sender does not match cafes[cafeId].owner",
  },
  InsufficientBacking: {
    code: "INSUFFICIENT_BACKING",
    userMessage:
      "Deposit cafe tidak cukup untuk mencetak poin sebanyak ini. " +
      "Cafe owner perlu menambah deposit MON terlebih dahulu.",
    devMessage:
      "circulatingPoints + amount exceeds deposit-backed cap (deposit × 10,000 / 1e18). " +
      "Call getMintablePoints(cafeId) to check remaining capacity.",
  },
  InsufficientPoints: {
    code: "INSUFFICIENT_POINTS",
    userMessage: "Poin kamu tidak cukup untuk transaksi ini.",
    devMessage:
      "ERC1155 _burn failed — customer balance < requested burn amount. " +
      "Call balanceOf(customer, pointsTokenId) before submitting.",
  },
  InvalidAmount: {
    code: "INVALID_AMOUNT",
    userMessage: "Jumlah tidak valid. Pastikan angka yang kamu masukkan benar.",
    devMessage:
      "Amount is zero, msg.value > type(uint96).max (~79.2 ETH), " +
      "or customer has zero points when calling claimRefund.",
  },
  CafeNotFound: {
    code: "CAFE_NOT_FOUND",
    userMessage: "Cafe tidak ditemukan.",
    devMessage:
      "cafes[cafeId].pointsTokenId == 0 — cafeId was never registered. " +
      "Double-check the cafeId value.",
  },
  VoucherNotFound: {
    code: "VOUCHER_NOT_FOUND",
    userMessage: "Jenis voucher tidak ditemukan.",
    devMessage:
      "voucherTypes[voucherTokenId].cafeId == 0 — voucher was never created. " +
      "Double-check the voucherTokenId value.",
  },
  CafeStillActive: {
    code: "CAFE_STILL_ACTIVE",
    userMessage:
      "Refund belum bisa diklaim. Cafe masih aktif " +
      "(dibutuhkan 90 hari tanpa aktivitas).",
    devMessage:
      "block.timestamp - cafe.lastActivity < INACTIVITY_THRESHOLD (90 days). " +
      "Call isRefundClaimable(cafeId) to check the current status.",
  },
  TransferFailed: {
    code: "TRANSFER_FAILED",
    userMessage: "Transfer MON gagal. Coba lagi atau hubungi support.",
    devMessage:
      "ETH .call{value: refundAmount}(msg.sender) returned false. " +
      "Recipient may have a reverting receive() / fallback().",
  },
};

const FALLBACK_ERROR: Omit<KopiError, "raw"> = {
  code: "UNKNOWN_ERROR",
  userMessage: "Terjadi kesalahan. Coba lagi.",
  devMessage: "Unrecognised error — inspect the `raw` field for details.",
};

function isUserRejected(err: unknown): boolean {
  const e = err as Record<string, unknown>;
  return (
    e?.["code"] === 4001 ||
    e?.["code"] === "ACTION_REJECTED" ||
    (typeof e?.["message"] === "string" &&
      (e["message"].toLowerCase().includes("user rejected") ||
        e["message"].toLowerCase().includes("user denied")))
  );
}

function getContractErrorName(err: unknown): string | null {
  const e = err as Record<string, unknown>;
  const direct = (e?.["data"] as Record<string, unknown>)?.["errorName"];
  if (typeof direct === "string") return direct;
  const cause = (e?.["cause"] as Record<string, unknown>)?.["data"];
  const nested = (cause as Record<string, unknown>)?.["errorName"];
  if (typeof nested === "string") return nested;
  return null;
}

function getShortMessage(err: unknown): string {
  const e = err as Record<string, unknown>;
  if (typeof e?.["shortMessage"] === "string") return e["shortMessage"] as string;
  if (typeof e?.["message"] === "string") return e["message"] as string;
  return "Unknown error";
}

function isBaseError(err: unknown): boolean {
  return typeof (err as Record<string, unknown>)?.["shortMessage"] === "string";
}

export function parseContractError(error: unknown): KopiError {
  if (isUserRejected(error)) {
    return {
      code: "USER_REJECTED",
      userMessage: "Transaksi dibatalkan.",
      devMessage: "User rejected the transaction in their wallet",
      raw: error,
    };
  }

  const errorName = getContractErrorName(error);
  if (errorName) {
    const mapped = CONTRACT_ERROR_MAP[errorName] ?? FALLBACK_ERROR;
    return { ...mapped, raw: error };
  }

  if (isBaseError(error)) {
    const msg = getShortMessage(error);
    for (const [name, mapped] of Object.entries(CONTRACT_ERROR_MAP)) {
      if (msg.includes(name)) return { ...mapped, raw: error };
    }
    if (msg.toLowerCase().includes("network")) {
      return {
        code: "NETWORK_ERROR",
        userMessage: "Koneksi ke jaringan gagal. Periksa koneksi internetmu.",
        devMessage: msg,
        raw: error,
      };
    }
    if (msg.toLowerCase().includes("gas")) {
      return {
        code: "GAS_ERROR",
        userMessage: "Gas tidak cukup untuk menyelesaikan transaksi ini.",
        devMessage: msg,
        raw: error,
      };
    }
    return { ...FALLBACK_ERROR, devMessage: msg, raw: error };
  }

  return { ...FALLBACK_ERROR, raw: error };
}

export const KopiErrorCode = {
  UNAUTHORIZED:         "UNAUTHORIZED",
  INSUFFICIENT_BACKING: "INSUFFICIENT_BACKING",
  INSUFFICIENT_POINTS:  "INSUFFICIENT_POINTS",
  INVALID_AMOUNT:       "INVALID_AMOUNT",
  CAFE_NOT_FOUND:       "CAFE_NOT_FOUND",
  VOUCHER_NOT_FOUND:    "VOUCHER_NOT_FOUND",
  CAFE_STILL_ACTIVE:    "CAFE_STILL_ACTIVE",
  TRANSFER_FAILED:      "TRANSFER_FAILED",
  USER_REJECTED:        "USER_REJECTED",
  NETWORK_ERROR:        "NETWORK_ERROR",
  GAS_ERROR:            "GAS_ERROR",
  UNKNOWN_ERROR:        "UNKNOWN_ERROR",
} as const;

export type KopiErrorCodeType = (typeof KopiErrorCode)[keyof typeof KopiErrorCode];
