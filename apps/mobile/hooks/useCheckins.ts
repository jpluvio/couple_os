import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { CheckIn, CheckinPeriod, Tables } from "@/types/database";

// Tipo del prompt di check-in (non esportato da database.ts, lo deriviamo qui)
export type CheckInPrompt = Tables<"check_in_prompts">;

// Stato derivato di un check-in dal punto di vista dell'utente corrente
export type CheckInStatus =
  | "waiting_you" // manca la tua risposta
  | "waiting_partner" // hai risposto, si aspetta il partner
  | "revealed"; // entrambi hanno risposto, le risposte sono visibili

const QUERY_KEY = (coupleId: string) => ["check_ins", coupleId];

// Hook per la lista dei check-in della coppia, con subscription realtime.
export function useCheckins() {
  const { user, coupleId } = useAuth();
  const queryClient = useQueryClient();

  const cid = coupleId ?? "";
  const qKey = QUERY_KEY(cid);

  const query = useQuery({
    queryKey: qKey,
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("couple_id", cid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CheckIn[];
    },
  });

  // Subscription realtime: ogni cambiamento sui check-in della coppia invalida la query.
  useEffect(() => {
    if (!cid) return;

    const channel = supabase
      .channel(`checkins-${cid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins", filter: `couple_id=eq.${cid}` },
        () => {
          queryClient.invalidateQueries({ queryKey: qKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cid]);

  return {
    checkins: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    queryKey: qKey,
    currentUserId: user?.id ?? null,
  };
}

// Hook per i prompt disponibili: di sistema (couple_id null) oppure custom della coppia.
export function useCheckinPrompts(period?: CheckinPeriod) {
  const { coupleId } = useAuth();
  const cid = coupleId ?? "";

  return useQuery({
    queryKey: ["check_in_prompts", cid, period ?? "all"],
    enabled: !!cid,
    queryFn: async () => {
      let q = supabase
        .from("check_in_prompts")
        .select("*")
        .eq("active", true)
        // Prompt di sistema (couple_id null) oppure custom della coppia corrente
        .or(`couple_id.is.null,couple_id.eq.${cid}`)
        .order("period_type", { ascending: true });

      if (period) q = q.eq("period_type", period);

      const { data, error } = await q;
      if (error) throw error;
      return data as CheckInPrompt[];
    },
  });
}

// Determina lo stato di un check-in dal punto di vista dell'utente corrente.
export function getCheckInStatus(checkin: CheckIn, currentUserId: string): CheckInStatus {
  if (checkin.revealed) return "revealed";

  const isUser1 = checkin.user1_id === currentUserId;
  // Risposta corrente = quella dello slot dell'utente
  const myResponse = isUser1 ? checkin.response1 : checkin.response2;

  if (!myResponse) return "waiting_you";
  return "waiting_partner";
}
