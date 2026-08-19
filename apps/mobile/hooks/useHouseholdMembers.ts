import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { HouseholdMember } from "@/types/database";

// Who takes part in the household expenses. A member may have an app account
// (`user_id`) or be a purely accounting entity — a flatmate, a child, a parent.

export function membersKey(coupleId: string | null) {
  return ["finance", "members", coupleId] as const;
}

export function useHouseholdMembers() {
  const { coupleId, user } = useAuth();

  const query = useQuery({
    queryKey: membersKey(coupleId),
    enabled: !!coupleId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("household_members")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as HouseholdMember[];
    },
  });

  const members = query.data ?? [];
  const active = useMemo(() => members.filter((m) => m.active), [members]);
  const me = useMemo(
    () => members.find((m) => m.user_id === user?.id) ?? null,
    [members, user?.id]
  );

  return {
    members,
    active,
    me,
    byId: useMemo(() => new Map(members.map((m) => [m.id, m])), [members]),
    canWrite: me?.role !== "VIEWER",
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
