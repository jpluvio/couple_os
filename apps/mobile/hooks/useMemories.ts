import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Memory } from "@/types/database";

// A memory together with its author (join on users).
export type MemoryWithAuthor = Memory & {
  author: { name: string | null; avatar_url: string | null } | null;
};

// Query key of the memories feed, scoped to the couple.
export const MEMORIES_QUERY_KEY = (coupleId: string) => ["memories", coupleId];

// Lifetime (seconds) of the signed URLs generated for the private bucket.
export const SIGNED_URL_TTL = 60 * 60; // 1 ora

/**
 * Loads the couple's memories feed, newest first.
 * Subscribes to realtime changes on `memories`, filtered by couple.
 */
export function useMemories(coupleId: string) {
  const queryClient = useQueryClient();
  const qKey = MEMORIES_QUERY_KEY(coupleId);

  const query = useQuery({
    queryKey: qKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memories")
        .select("*, author:users!author_id(name, avatar_url)")
        .eq("couple_id", coupleId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MemoryWithAuthor[];
    },
  });

  // Realtime subscription: invalidates the feed on every change.
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`memories-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memories", filter: `couple_id=eq.${coupleId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: qKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  return query;
}

/**
 * Genera un signed URL per una foto del bucket privato `memories`.
 * Nel DB salviamo il PATH (es. `{couple_id}/abc.jpg`), non l'URL,
 * perché i signed URL scadono. L'URL viene rigenerato al momento del render
 * e messo in cache da React Query.
 */
export function useSignedPhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["memory-photo", path],
    enabled: !!path,
    // Signed URLs expire: refresh them before they do.
    staleTime: (SIGNED_URL_TTL - 60) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("memories")
        .createSignedUrl(path!, SIGNED_URL_TTL);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
