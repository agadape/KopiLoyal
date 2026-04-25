import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type TxType = "earn" | "redeem" | "voucher_buy" | "refund";
const AVATAR_BUCKET = "avatars";

export type CafeMeta = {
  id: string;
  chain_cafe_id: number;
  name: string;
  location: string;
  earn_rate_idr: number;
  burn_rate_idr: number;
  owner_address: string;
};

export type TransactionRow = {
  id: string;
  cafe_id: string;
  cafe_name: string;
  customer_address: string;
  type: TxType;
  points: number;
  idr_amount: number;
  tx_hash: string;
  created_at: string;
};

export type UserProfileRow = {
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at?: string;
};

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getTransactions(address: string): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("customer_address", address.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function logTransaction(tx: Omit<TransactionRow, "id" | "created_at">) {
  const { error } = await supabase.from("transactions").insert({
    ...tx,
    customer_address: tx.customer_address.toLowerCase(),
  });
  if (error) throw error;
}

export async function getCafes(): Promise<CafeMeta[]> {
  const { data, error } = await supabase.from("cafes").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function getUserProfile(address: string): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("wallet_address, display_name, avatar_url, updated_at")
    .eq("wallet_address", address.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserProfile(profile: UserProfileRow) {
  const { error } = await supabase.from("profiles").upsert(
    {
      wallet_address: profile.wallet_address.toLowerCase(),
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    },
    { onConflict: "wallet_address" }
  );

  if (error) throw error;
}

export async function uploadAvatar(address: string, file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${address.toLowerCase()}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });

  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
