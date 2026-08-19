import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { ExpenseCategory, ExpenseKind } from "@/types/database";

// Categories are data, not constants: this hook is the only place the app
// reads them from. (Budget OS phase 1 — docs/budgeting/roadmap.md §1.3)

export function categoriesKey(coupleId: string | null) {
  return ["finance", "categories", coupleId] as const;
}

export function useCategories() {
  const { coupleId } = useAuth();

  const query = useQuery({
    queryKey: categoriesKey(coupleId),
    enabled: !!coupleId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  const categories = query.data ?? [];
  const active = useMemo(() => categories.filter((c) => !c.archived), [categories]);
  const byId = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  return {
    categories,
    active,
    byId,
    fixed: active.filter((c) => c.kind === "FIXED"),
    variable: active.filter((c) => c.kind === "VARIABLE"),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

interface CategoryInput {
  label: string;
  emoji?: string | null;
  color?: string | null;
  kind: ExpenseKind;
}

function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export function useCategoryMutations() {
  const { coupleId } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: categoriesKey(coupleId) });

  const create = useMutation({
    mutationFn: async (input: CategoryInput) => {
      const slug = `${slugify(input.label) || "category"}_${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from("expense_categories")
        .insert({
          couple_id: coupleId!,
          slug,
          label: input.label,
          emoji: input.emoji ?? null,
          color: input.color ?? null,
          kind: input.kind,
          sort_order: 500,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ExpenseCategory;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CategoryInput> & { id: string }) => {
      const { error } = await supabase
        .from("expense_categories")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // A category with expenses attached is archived, never deleted: the history
  // and the statistics keep it. The delete is only tried for empty ones, and
  // the database refuses it otherwise.
  const archive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from("expense_categories")
        .update({ archived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, archive, remove };
}
