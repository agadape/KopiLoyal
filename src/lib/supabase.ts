import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type TxType = "earn" | "redeem" | "voucher_buy" | "refund";

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
