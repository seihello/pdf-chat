import createClient from "@/lib/supabase/client";

export default async function isSupabaseRunning(): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("status")
    .select("status")
    .eq("name", "alive")
    .single();

  if (error) return false;
  return data.status;
}
