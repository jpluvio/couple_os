import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Scheduled via Supabase Cron: every day at 09:00
// Dashboard → Edge Functions → daily-cron → Schedule: 0 9 * * *

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sendPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  if (!tokens.length) return;
  await supabase.functions.invoke("send-notification", {
    body: { push_tokens: tokens, title, body, data },
  });
}

async function getPushTokens(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return [];
  const { data } = await supabase
    .from("users")
    .select("push_tokens")
    .in("id", userIds);
  return (data ?? []).flatMap((u: { push_tokens: string[] }) => u.push_tokens);
}

// 1. Pantry expiry alert (items expiring within 3 days)
async function checkPantryExpiry() {
  const today = new Date();
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);

  const { data: items } = await supabase
    .from("pantry_items")
    .select("name, expires_at, couples!inner(members:users(id, push_tokens))")
    .gte("expires_at", today.toISOString().split("T")[0])
    .lte("expires_at", in3Days.toISOString().split("T")[0]);

  if (!items?.length) return;

  // Group by couple to avoid duplicate notifications
  const byCouple = new Map<string, { names: string[]; tokens: string[] }>();
  for (const item of items as Record<string, unknown>[]) {
    const couple = item.couples as { members: { id: string; push_tokens: string[] }[] };
    const coupleKey = JSON.stringify(couple.members.map((m) => m.id).sort());
    if (!byCouple.has(coupleKey)) {
      byCouple.set(coupleKey, {
        names: [],
        tokens: couple.members.flatMap((m) => m.push_tokens),
      });
    }
    byCouple.get(coupleKey)!.names.push(item.name as string);
  }

  for (const { names, tokens } of byCouple.values()) {
    const body =
      names.length === 1
        ? `${names[0]} expires within 3 days`
        : `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` and ${names.length - 3} more` : ""} expire soon`;
    await sendPush(tokens, "Pantry — expiring soon 🥛", body, { screen: "pantry" });
  }
}

// 2. "On this day" — memories from the same day in past years
async function checkOnThisDay() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { data: memories } = await supabase
    .from("memories")
    .select("content, date, couple_id, couples!inner(members:users(id, push_tokens))")
    .filter("date", "neq", today.toISOString().split("T")[0])
    .filter("extract(month from date::date)", "eq", month)
    .filter("extract(day from date::date)", "eq", day);

  if (!memories?.length) return;

  // One notification per couple
  const seen = new Set<string>();
  for (const memory of memories as Record<string, unknown>[]) {
    const coupleId = memory.couple_id as string;
    if (seen.has(coupleId)) continue;
    seen.add(coupleId);

    const couple = memory.couples as { members: { id: string; push_tokens: string[] }[] };
    const tokens = couple.members.flatMap((m) => m.push_tokens);
    const date = new Date(memory.date as string);
    const yearsAgo = today.getFullYear() - date.getFullYear();

    await sendPush(
      tokens,
      "A memory from today 📸",
      `${yearsAgo} ${yearsAgo === 1 ? "year" : "years"} ago…`,
      { screen: "memories" },
    );
  }
}

// 3. Todo deadline — tasks due tomorrow
async function checkTodoDeadlines() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split("T")[0];

  const { data: items } = await supabase
    .from("todo_items")
    .select("title, assignee_id, todo_lists!inner(couple_id, couples!inner(members:users(id, push_tokens)))")
    .eq("status", "TODO")
    .gte("deadline", `${tomorrowDate}T00:00:00Z`)
    .lt("deadline", `${tomorrowDate}T23:59:59Z`);

  if (!items?.length) return;

  for (const item of items as Record<string, unknown>[]) {
    const list = item.todo_lists as {
      couple_id: string;
      couples: { members: { id: string; push_tokens: string[] }[] };
    };

    // With an assignee, notify only them; otherwise every member
    let tokens: string[];
    if (item.assignee_id) {
      const member = list.couples.members.find((m) => m.id === item.assignee_id);
      tokens = member?.push_tokens ?? [];
    } else {
      tokens = list.couples.members.flatMap((m) => m.push_tokens);
    }

    await sendPush(tokens, "Task due tomorrow ✅", item.title as string, {
      screen: "todo",
    });
  }
}

// 4. Post the recurring expenses that fell due, for every household.
// Idempotent: the unique index on (recurring_expense_id, occurrence_date)
// makes a double run a no-op, so this is safe to retry.
async function postDueRecurring() {
  const { data: couples } = await supabase.from("couples").select("id");
  if (!couples?.length) return;

  const today = new Date().toISOString().split("T")[0];

  for (const couple of couples as { id: string }[]) {
    const { error } = await supabase.rpc("post_due_recurring", {
      p_couple_id: couple.id,
      p_up_to: today,
    });
    if (error) console.error("post_due_recurring failed", couple.id, error.message);
  }
}

serve(async () => {
  await Promise.all([
    checkPantryExpiry(),
    checkOnThisDay(),
    checkTodoDeadlines(),
    postDueRecurring(),
  ]);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
