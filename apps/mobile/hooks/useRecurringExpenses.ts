import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { todayISO } from "@/lib/format";
import type { RecurringExpense } from "@/types/database";
import type { CreateRecurringExpenseForm } from "@couple-os/shared";

// Fixed expenses: declared once, posted by themselves.
// (Budget OS phase 2 — docs/budgeting/roadmap.md §2)

export function recurringKey(coupleId: string | null) {
  return ["finance", "recurring", coupleId] as const;
}

export function useRecurringExpenses() {
  const { coupleId } = useAuth();

  const query = useQuery({
    queryKey: recurringKey(coupleId),
    enabled: !!coupleId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("active", { ascending: false })
        .order("label", { ascending: true });
      if (error) throw error;
      return data as RecurringExpense[];
    },
  });

  const recurring = query.data ?? [];

  return {
    recurring,
    active: recurring.filter((r) => r.active),
    pending: recurring.filter((r) => r.active && r.pending_occurrence != null),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Posts whatever is due for the current household on app open. The cron does
 * the same every morning; both are idempotent, so running both is harmless
 * and covers a household created after the last cron run.
 */
export function useRecurringCatchUp() {
  const { coupleId } = useAuth();
  const queryClient = useQueryClient();
  const alreadyRan = useRef<string | null>(null);

  useEffect(() => {
    if (!coupleId || alreadyRan.current === coupleId) return;
    alreadyRan.current = coupleId;

    (async () => {
      const { data, error } = await supabase.rpc("post_due_recurring", {
        p_couple_id: coupleId,
        p_up_to: todayISO(),
      });
      if (error) {
        console.warn("Recurring catch-up failed", error.message);
        return;
      }
      // Only disturb the cache when something was actually posted.
      if ((data ?? 0) > 0) {
        queryClient.invalidateQueries({ queryKey: ["finance"] });
        queryClient.invalidateQueries({ queryKey: ["expenses", coupleId] });
      }
      queryClient.invalidateQueries({ queryKey: recurringKey(coupleId) });
    })();
  }, [coupleId, queryClient]);
}

export function useRecurringMutations() {
  const { coupleId } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["finance"] });
    queryClient.invalidateQueries({ queryKey: ["expenses", coupleId] });
  };

  const create = useMutation({
    mutationFn: async (input: CreateRecurringExpenseForm) => {
      const { error } = await supabase.from("recurring_expenses").insert({
        couple_id: coupleId!,
        label: input.label,
        amount: input.amount,
        category_id: input.category_id,
        paid_by_member_id: input.paid_by_member_id ?? null,
        frequency: input.frequency,
        day_of_month: input.day_of_month ?? null,
        day_of_week: input.day_of_week ?? null,
        start_date: input.start_date,
        end_date: input.end_date ?? null,
        auto_post: input.auto_post,
        variable_amount: input.variable_amount,
        note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RecurringExpense> & { id: string }) => {
      const { error } = await supabase.from("recurring_expenses").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const confirm = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount?: number }) => {
      const { error } = await supabase.rpc("confirm_recurring_occurrence", {
        p_recurring_id: id,
        p_amount: amount ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const skip = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("skip_recurring_occurrence", {
        p_recurring_id: id,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, confirm, skip };
}
