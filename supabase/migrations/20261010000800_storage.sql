-- Partivo.az — Supabase Storage buckets and access policies.
-- Objects are stored under "<owner uuid>/..." and only that owner may write or delete them.
-- Reads are public because listing photos and avatars are shown on public pages; file names are random UUIDs.
-- Uploads go through the app's server route, which validates and re-encodes every image with sharp first.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880, array['image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "partivo_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('listing-images', 'avatars'));

create policy "partivo_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_user_suspended(auth.uid())
  );

create policy "partivo_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('listing-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('listing-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "partivo_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('listing-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
