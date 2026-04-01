import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon);

export interface FortuneRecord {
  id?: string;
  created_at?: string;
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
  result_json: string; // JSON.stringify(result)
}

export async function saveFortuneResult(record: Omit<FortuneRecord, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("fortune_results")
    .insert(record)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function getRecentResults(limit = 10): Promise<FortuneRecord[]> {
  const { data, error } = await supabase
    .from("fortune_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
