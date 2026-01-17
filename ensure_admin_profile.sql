-- Link specific admin user from auth.users to public.profiles
-- This fixes the issue where a user exists in Authentication but has no Profile data

insert into public.profiles (id, name, email, role)
select id, 'Admin', email, 'admin'
from auth.users
where email = 'admin@paraty.com'
on conflict (id) do update 
set role = 'admin', name = 'Admin';

-- Verify the result
select * from public.profiles where email = 'admin@paraty.com';
