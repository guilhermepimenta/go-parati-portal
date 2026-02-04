-- Create a new public bucket named 'images'
insert into storage.buckets (id, name, public)
values ('images', 'images', true);

-- Policy: Allow public read access to the bucket
create policy "Public images are viewable by everyone"
on storage.objects for select
using ( bucket_id = 'images' );

-- Policy: Allow authenticated users to upload images
create policy "Authenticated users can upload images"
on storage.objects for insert
with check ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Policy: Allow authenticated users to update their own images (optional, simplistic version)
create policy "Authenticated users can update images"
on storage.objects for update
using ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Policy: Allow authenticated users to delete images
create policy "Authenticated users can delete images"
on storage.objects for delete
using ( bucket_id = 'images' and auth.role() = 'authenticated' );
