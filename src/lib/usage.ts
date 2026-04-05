import { supabase } from "./supabase";
import { PLAN_LIMITS } from "./plans";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUser(userId: string) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function createUser(userId: string, email: string) {
  const { error } = await supabase
    .from("users")
    .insert({ id: userId, email, plan: "free" });
  if (error) throw error;
}

export async function getUsage(userId: string) {
  const month = currentMonth();
  const { data } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .single();
  return data; // null if no row yet (= 0 replies used)
}

export async function incrementUsage(userId: string) {
  const month = currentMonth();
  const { error } = await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_month: month,
  });
  if (error) throw error;
}

export async function checkLimit(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;

  const plan = user.plan ?? "free";
  const limit = PLAN_LIMITS[plan];
  if (limit === -1) return true;

  const usage = await getUsage(userId);
  const count = usage?.reply_count ?? 0;
  return count < limit;
}
