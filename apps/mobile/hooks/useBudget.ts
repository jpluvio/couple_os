import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { BudgetOverview } from "@/types/database";

// The whole Budget screen in one round trip: planned, carried, spent,
// remaining and status per category are computed in Postgres.
// (Budget OS phase 3 — docs/budgeting/specs.md §4.3)

export function overviewKey(coupleId: string | null, periodKey: string) {
  return ["finance", "overview", coupleId, periodKey] as const;
}

export function useBudgetOverview(periodKey: string) {
  const { coupleId } = useAuth();

  const query = useQuery({
    queryKey: overviewKey(coupleId, periodKey),
    enabled: !!coupleId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_budget_overview", {
        p_period: periodKey,
      });
      if (error) throw error;
      return data as unknown as BudgetOverview;
    },
  });

  return {
    overview: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useBudgetMutations(periodKey: string) {
  const { coupleId } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance"] });

  const setLine = useMutation({
    mutationFn: async ({
      categoryId,
      amount,
      rollover,
    }: {
      categoryId: string;
      amount: number | null;
      rollover?: boolean;
    }) => {
      const { error } = await supabase.rpc("set_budget_amount", {
        p_period: periodKey,
        p_category_id: categoryId,
        p_amount: amount as number,
        p_rollover: rollover,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setIncome = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase.rpc("set_expected_income", {
        p_period: periodKey,
        p_amount: amount,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const copyFromPreviousMonth = useMutation({
    mutationFn: async (from: string) => {
      const { error } = await supabase.rpc("create_next_period", {
        p_period: periodKey,
        p_copy_from: from,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const closePeriod = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("close_budget_period", { p_period: periodKey });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { setLine, setIncome, copyFromPreviousMonth, closePeriod, coupleId };
}
