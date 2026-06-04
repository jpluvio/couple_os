-- Couple OS — Storage bucket per le foto delle Memories
-- ─────────────────────────────────────────
-- Bucket privato 'memories'. I file sono organizzati per coppia:
--   {couple_id}/{filename}
-- Le policy RLS su storage.objects limitano l'accesso ai membri della coppia,
-- confrontando il primo segmento del path con get_couple_id().
-- ─────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

-- SELECT: membri della coppia possono leggere i file della propria coppia
create policy "memories storage: read own couple"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = public.get_couple_id()::text
  );

-- INSERT: upload solo nella cartella della propria coppia
create policy "memories storage: insert own couple"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = public.get_couple_id()::text
  );

-- UPDATE: solo file della propria coppia
create policy "memories storage: update own couple"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = public.get_couple_id()::text
  );

-- DELETE: solo file della propria coppia
create policy "memories storage: delete own couple"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = public.get_couple_id()::text
  );
