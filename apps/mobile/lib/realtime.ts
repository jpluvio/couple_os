import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Sottoscrive i cambiamenti di una tabella e richiama `onChange` a ogni evento.
 *
 * Il punto delicato è il nome del canale. `RealtimeClient.channel(topic)` NON
 * crea sempre un canale nuovo: se ne esiste già uno con lo stesso topic
 * restituisce quello. Due componenti che chiedevano lo stesso topic — succede
 * con `NotificationBell`, presente negli header di più tab che expo-router
 * tiene montati insieme — ricevevano quindi lo stesso canale già sottoscritto,
 * e la seconda `.on()` faceva esplodere l'app con
 * "cannot add `postgres_changes` callbacks ... after `subscribe()`".
 * Nella stessa situazione lo smontaggio del primo componente chiamava
 * `removeChannel` sul canale condiviso, spegnendo il realtime del secondo.
 *
 * Per questo ogni istanza del hook aggiunge un suffisso irripetibile al topic:
 * ognuna possiede il proprio canale e può chiuderlo senza disturbare nessuno.
 */
export type TableFilter = { table: string; filter?: string };

export function useTableSubscription(
  topic: string | null | undefined,
  tables: TableFilter[],
  onChange: () => void
) {
  // Identità stabile per tutta la vita del componente, distinta fra istanze.
  const instanceId = useRef<string>(null);
  if (instanceId.current === null) {
    instanceId.current = Math.random().toString(36).slice(2, 10);
  }

  // `onChange` è spesso una closure ricreata a ogni render: tenerla in un ref
  // evita di disiscriversi e risottoscriversi di continuo.
  const handler = useRef(onChange);
  handler.current = onChange;

  // Stessa ragione per l'array: confrontarlo per valore, non per identità.
  const key = JSON.stringify(tables);

  useEffect(() => {
    if (!topic) return;

    const channel = supabase.channel(`${topic}-${instanceId.current}`);
    for (const { table, filter } of JSON.parse(key) as TableFilter[]) {
      channel.on(
        "postgres_changes",
        filter
          ? { event: "*", schema: "public", table, filter }
          : { event: "*", schema: "public", table },
        () => handler.current()
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topic, key]);
}
