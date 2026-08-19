import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Schedulata via Supabase Cron: ogni giorno alle 09:00
// Dashboard → Edge Functions → daily-cron → Schedule: 0 9 * * *
//
// I promemoria vengono scritti nella tabella `notifications`: l'app li mostra
// nella campanella con il badge dei non letti, in tempo reale via Realtime.
// Se in futuro l'app girerà anche in nativo, `send-notification` resta pronta
// per recapitare gli stessi contenuti anche come push.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface Member {
  id: string;
}

interface NotificationRow {
  couple_id: string;
  recipient_id: string;
  type: string;
  entity_id: string | null;
  title: string;
  body: string;
}

// I promemoria non hanno un autore: actor_id resta null.
// Il cron può essere rieseguito nello stesso giorno (retry, doppia
// schedulazione): salta le notifiche già scritte nelle ultime 20 ore.
async function insertNotifications(rows: NotificationRow[]): Promise<number> {
  if (!rows.length) return 0;

  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await supabase
    .from("notifications")
    .select("recipient_id, type, entity_id")
    .in("recipient_id", [...new Set(rows.map((r) => r.recipient_id))])
    .gte("created_at", since);

  const seen = new Set(
    (recent ?? []).map(
      (n: { recipient_id: string; type: string; entity_id: string | null }) =>
        `${n.recipient_id}|${n.type}|${n.entity_id ?? ""}`,
    ),
  );

  const fresh = rows.filter(
    (r) => !seen.has(`${r.recipient_id}|${r.type}|${r.entity_id ?? ""}`),
  );

  if (!fresh.length) return 0;

  const { error } = await supabase.from("notifications").insert(fresh);
  if (error) throw error;

  return fresh.length;
}

// 1. Pantry expiry alert (prodotti in scadenza entro 3 giorni)
async function checkPantryExpiry(): Promise<NotificationRow[]> {
  const today = new Date();
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);

  const { data: items } = await supabase
    .from("pantry_items")
    .select("id, name, expires_at, couple_id, couples!inner(members:users(id))")
    .gte("expires_at", today.toISOString().split("T")[0])
    .lte("expires_at", in3Days.toISOString().split("T")[0]);

  if (!items?.length) return [];

  // Una sola notifica per coppia, che elenca i prodotti in scadenza
  const byCouple = new Map<string, { names: string[]; members: Member[] }>();
  for (const item of items as Record<string, unknown>[]) {
    const coupleId = item.couple_id as string;
    const couple = item.couples as { members: Member[] };

    if (!byCouple.has(coupleId)) {
      byCouple.set(coupleId, { names: [], members: couple.members });
    }
    byCouple.get(coupleId)!.names.push(item.name as string);
  }

  const rows: NotificationRow[] = [];
  for (const [coupleId, { names, members }] of byCouple) {
    const body =
      names.length === 1
        ? `${names[0]} scade nei prossimi 3 giorni`
        : `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` e altri ${names.length - 3}` : ""} scadono presto`;

    for (const member of members) {
      rows.push({
        couple_id: coupleId,
        recipient_id: member.id,
        type: "pantry",
        // entity_id null: la notifica è per il gruppo di prodotti del giorno,
        // e la deduplica deve valere per l'intera coppia
        entity_id: null,
        title: "Dispensa — Prodotti in scadenza 🥛",
        body,
      });
    }
  }

  return rows;
}

// 2. "On this day" — memories dello stesso giorno degli anni scorsi
async function checkOnThisDay(): Promise<NotificationRow[]> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { data: memories } = await supabase
    .from("memories")
    .select("id, content, date, couple_id, couples!inner(members:users(id))")
    .filter("date", "neq", today.toISOString().split("T")[0])
    .filter("extract(month from date::date)", "eq", month)
    .filter("extract(day from date::date)", "eq", day);

  if (!memories?.length) return [];

  const rows: NotificationRow[] = [];
  const seen = new Set<string>();

  for (const memory of memories as Record<string, unknown>[]) {
    const coupleId = memory.couple_id as string;
    if (seen.has(coupleId)) continue;
    seen.add(coupleId);

    const couple = memory.couples as { members: Member[] };
    const date = new Date(memory.date as string);
    const yearsAgo = today.getFullYear() - date.getFullYear();

    for (const member of couple.members) {
      rows.push({
        couple_id: coupleId,
        recipient_id: member.id,
        type: "memory",
        entity_id: memory.id as string,
        title: "Un ricordo di oggi 📸",
        body: `${yearsAgo} ${yearsAgo === 1 ? "anno" : "anni"} fa...`,
      });
    }
  }

  return rows;
}

// 3. Todo deadline — task in scadenza domani
async function checkTodoDeadlines(): Promise<NotificationRow[]> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split("T")[0];

  const { data: items } = await supabase
    .from("todo_items")
    .select("id, title, assignee_id, todo_lists!inner(couple_id, couples!inner(members:users(id)))")
    .eq("status", "TODO")
    .gte("deadline", `${tomorrowDate}T00:00:00Z`)
    .lt("deadline", `${tomorrowDate}T23:59:59Z`);

  if (!items?.length) return [];

  const rows: NotificationRow[] = [];

  for (const item of items as Record<string, unknown>[]) {
    const list = item.todo_lists as {
      couple_id: string;
      couples: { members: Member[] };
    };

    // Se il task ha un assegnatario avvisa solo lui, altrimenti entrambi
    const recipients = item.assignee_id
      ? list.couples.members.filter((m) => m.id === item.assignee_id)
      : list.couples.members;

    for (const member of recipients) {
      rows.push({
        couple_id: list.couple_id,
        recipient_id: member.id,
        type: "todo_due",
        entity_id: item.id as string,
        title: "Task in scadenza domani ✅",
        body: item.title as string,
      });
    }
  }

  return rows;
}

serve(async () => {
  try {
    const batches = await Promise.all([
      checkPantryExpiry(),
      checkOnThisDay(),
      checkTodoDeadlines(),
    ]);

    const created = await insertNotifications(batches.flat());

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
