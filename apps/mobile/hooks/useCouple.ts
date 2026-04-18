import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { Couple, User } from "@/types/database";

interface CoupleWithMembers extends Couple {
  members: User[];
}

interface UseCoupleReturn {
  couple: CoupleWithMembers | null;
  partner: User | null;
  loading: boolean;
  error: Error | null;
}

export function useCouple(): UseCoupleReturn {
  const { coupleId, user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["couple", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("couples")
        .select("*, members:users(*)")
        .eq("id", coupleId!)
        .single();

      if (error) throw error;
      return data as CoupleWithMembers;
    },
  });

  const partner = data?.members.find((m) => m.id !== user?.id) ?? null;

  return {
    couple: data ?? null,
    partner,
    loading: isLoading,
    error: error as Error | null,
  };
}
