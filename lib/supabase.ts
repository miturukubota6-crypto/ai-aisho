import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 環境変数が未設定でもクラッシュしないように遅延初期化
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

export interface FortuneRecord {
  id?: string;
  created_at?: string;
  mode?: "compat" | "solo"; // 未指定=相性占い（後方互換）。localStorage表示用
  name1: string;
  birth1: string;
  gender1: string;
  blood1: string;
  name2: string;
  birth2: string;
  gender2: string;
  blood2: string;
  category: string;
  score: number;
  oneliner: string;
  result_json: string;
}

export async function saveFortuneResult(record: Omit<FortuneRecord, "id" | "created_at">) {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client
    .from("fortune_results")
    .insert(record)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function getRecentResults(limit = 20): Promise<FortuneRecord[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client
    .from("fortune_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}
