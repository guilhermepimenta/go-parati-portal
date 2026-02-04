-- Create the leads table
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  business_name text not null,
  email text not null,
  phone text not null,
  message text,
  status text default 'new',
  created_at timestamptz default now()
);

-- Enable RLS
alter table leads enable row level security;

-- Policy: Anyone can INSERT (Submit the form)
create policy "Public can insert leads"
on leads for insert
to anon, authenticated
with check (true);

-- Policy: Only Authenticated Users (Admins) can VIEW content
create policy "Admins can view leads"
on leads for select
to authenticated
using (true);

-- Policy: Only Authenticated Users (Admins) can DELETE content
create policy "Admins can delete leads"
on leads for delete
to authenticated
using (true);
