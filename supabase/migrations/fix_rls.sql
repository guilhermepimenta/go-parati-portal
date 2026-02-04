-- Allow users to read any profile (needed for mapping names/roles publicly if needed, or at least their own)
create policy "Public profiles are viewable by everyone" 
on public.profiles for select 
using (true);

-- Allow users to insert their own profile
create policy "Users can insert their own profile" 
on public.profiles for insert 
with check (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = id);

-- Grant usage on schema just in case
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
