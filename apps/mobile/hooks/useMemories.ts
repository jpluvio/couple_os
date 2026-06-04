import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Memory } from "@/types/database";

// Memoria con il relativo autore (join su users).
export type MemoryWithAuthor = Memory & {
  author: { name: string | null; avatar_url: string | null } | null;
};

// Chiave query del feed memorie, scoped sulla coppia.
export const MEMORIES_QUERY_KEY = (coupleId: string) => ["memories", coupleId];

// Durata (in secondi) dei signed URL generati per le foto del bucket privato.
export const SIGNED_URL_TTL = 60 * 60; // 1 ora

/**
 * Carica il feed delle memorie della coppia, ordinate per data (desc).
 * Si iscrive ai cambiamenti realtime sulla tabella `memories` filtrati per coppia.
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

  // Sottoscrizione realtime: invalida il feed a ogni cambiamento.
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
    // I signed URL scadono: li rinfreschiamo prima della scadenza.
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
