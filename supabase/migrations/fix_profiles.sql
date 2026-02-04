-- Enable RLS on profiles if not already enabled
alter table public.profiles enable row level security;

-- Drop existing policies to avoid "already exists" errors
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Authenticated users can read all profiles" on public.profiles;

-- Allow users to read their own profile
create policy "Users can read own profile"
on public.profiles for select
using ( auth.uid() = id );

-- Allow users to update their own profile
create policy "Users can update own profile"
on public.profiles for update
using ( auth.uid() = id );

-- Allow users to insert their own profile (for sign up)
create policy "Users can insert own profile"
on public.profiles for insert
with check ( auth.uid() = id );

-- Allow admins (or all authenticated for now) to read all profiles
create policy "Authenticated users can read all profiles"
on public.profiles for select
using ( auth.role() = 'authenticated' );
