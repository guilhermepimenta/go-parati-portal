-- Create the table for the live feed posts
create table public.feed_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  image_url text not null,
  caption text,
  likes integer default 0,
  active boolean default true
);

-- Enable RLS
alter table public.feed_posts enable row level security;

-- Allow read access to everyone
create policy "Public Feed Read Access"
on public.feed_posts for select
to anon, authenticated
using (true);

-- Allow write access only to authenticated users (admins)
create policy "Admin Feed Write Access"
on public.feed_posts for insert
to authenticated
with check (true);

create policy "Admin Feed Update Access"
on public.feed_posts for update
to authenticated
using (true);

create policy "Admin Feed Delete Access"
on public.feed_posts for delete
to authenticated
using (true);

-- Storage Policies (Assuming 'images' bucket exists, if not 'feed-images')
-- If you are using a separate bucket 'feed-images', create it in the dashboard.
-- Below is for the standard 'images' bucket if we reuse it, or adapting for 'feed-images'.

-- FOR 'feed-images' BUCKET:
-- 1. Create a new bucket named 'feed-images' in Supabase Storage.
-- 2. Add these policies in the Storage > Policies dashboard:
--    - SELECT: Enable for 'anon' and 'authenticated' (Give public read access)
--    - INSERT/UPDATE/DELETE: Enable for 'authenticated' users only.
