-- Enable RLS on businesses table
alter table businesses enable row level security;

-- Remove existing policies to start fresh
drop policy if exists "Enable read access for all users" on businesses;
drop policy if exists "Enable insert for authenticated users" on businesses;
drop policy if exists "Enable update for authenticated users" on businesses;
drop policy if exists "Enable delete for authenticated users" on businesses;

-- Policy 1: Everyone can read published businesses (or all for now)
create policy "Enable read access for all users"
on businesses for select
using (true);

-- Policy 2: Authenticated users (Admins/Editors) can INSERT
create policy "Enable insert for authenticated users"
on businesses for insert
with check ( auth.role() = 'authenticated' );

-- Policy 3: Authenticated users can UPDATE
create policy "Enable update for authenticated users"
on businesses for update
using ( auth.role() = 'authenticated' );

-- Policy 4: Authenticated users can DELETE
create policy "Enable delete for authenticated users"
on businesses for delete
using ( auth.role() = 'authenticated' );
