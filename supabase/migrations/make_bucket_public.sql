-- Force the bucket to be public (Update if exists, Insert if not)
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update
set public = true;

-- Remove potential conflicting policies to ensure a clean slate
drop policy if exists "Public images are viewable by everyone" on storage.objects;
drop policy if exists "Give me access to own images" on storage.objects;

-- Create a permissive SELECT policy for the images bucket
create policy "Public images are viewable by everyone"
on storage.objects for select
using ( bucket_id = 'images' );

-- Ensure authenticated users can still upload (if not already covered)
drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images"
on storage.objects for insert
with check ( bucket_id = 'images' and auth.role() = 'authenticated' );
