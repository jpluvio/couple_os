import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Schedulata via Supabase Cron: ogni giorno alle 09:00
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

// 1. Pantry expiry alert (prodotti in scadenza entro 3 giorni)
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

  // Raggruppa per coppia per evitare notifiche duplicate
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
        ? `${names[0]} scade nei prossimi 3 giorni`
        : `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` e altri ${names.length - 3}` : ""} scadono presto`;
    await sendPush(tokens, "Dispensa — Prodotti in scadenza 🥛", body, { screen: "pantry" });
  }
}

// 2. "On this day" — memories dello stesso giorno degli anni scorsi
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

  // Una notifica per coppia
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
      "Un ricordo di oggi 📸",
      `${yearsAgo} ${yearsAgo === 1 ? "anno" : "anni"} fa...`,
      { screen: "memories" },
    );
  }
}

// 3. Todo deadline — task in scadenza domani
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

    // Se ha un assegnatario, notifica solo lui; altrimenti entrambi i partner
    let tokens: string[];
    if (item.assignee_id) {
      const member = list.couples.members.find((m) => m.id === item.assignee_id);
      tokens = member?.push_tokens ?? [];
    } else {
      tokens = list.couples.members.flatMap((m) => m.push_tokens);
    }

    await sendPush(tokens, "Task in scadenza domani ✅", item.title as string, {
      screen: "todo",
    });
  }
}

serve(async () => {
  await Promise.all([
    checkPantryExpiry(),
    checkOnThisDay(),
    checkTodoDeadlines(),
  ]);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
