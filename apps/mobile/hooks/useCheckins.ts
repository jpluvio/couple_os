import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { CheckIn, CheckinPeriod, Tables } from "@/types/database";

// Check-in prompt type (not exported by database.ts, derived here)
export type CheckInPrompt = Tables<"check_in_prompts">;

// State of a check-in from the current user's point of view
export type CheckInStatus =
  | "waiting_you" // your answer is missing
  | "waiting_partner" // you answered, waiting for your partner
  | "revealed"; // both answered, the answers are visible

const QUERY_KEY = (coupleId: string) => ["check_ins", coupleId];

// The couple's check-ins, with a realtime subscription.
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

  // Realtime: any change to the couple's check-ins invalidates the query.
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

// Available prompts: system ones (couple_id null) or the couple's own.
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
        // System prompts (couple_id null) or the current couple's own
        .or(`couple_id.is.null,couple_id.eq.${cid}`)
        .order("period_type", { ascending: true });

      if (period) q = q.eq("period_type", period);

      const { data, error } = await q;
      if (error) throw error;
      return data as CheckInPrompt[];
    },
  });
}

// Works out the state of a check-in from the current user's point of view.
export function getCheckInStatus(checkin: CheckIn, currentUserId: string): CheckInStatus {
  if (checkin.revealed) return "revealed";

  const isUser1 = checkin.user1_id === currentUserId;
  // The current answer is the one in this user's slot
  const myResponse = isUser1 ? checkin.response1 : checkin.response2;

  if (!myResponse) return "waiting_you";
  return "waiting_partner";
}
