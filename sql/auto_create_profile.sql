-- Create a trigger that automatically creates a `profiles` row
-- whenever a new row is inserted into `auth.users`.
-- Apply this in the Supabase SQL editor (requires appropriate privileges).

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Insert a basic profile for the newly created auth user.
  insert into public.profiles(id, username, email, name, role, avatar)
  values (
    new.id,
    split_part(new.email, '@', 1),
    new.email,
    coalesce(new.user_metadata ->> 'full_name', split_part(new.email, '@', 1)),
    'teacher',
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Create trigger on auth.users
drop trigger if exists create_profile_on_auth_user on auth.users;
create trigger create_profile_on_auth_user
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

-- Notes:
-- * This will create a profile for every new auth user with default role 'teacher'.
-- * Adjust the default role or mapping logic as needed before applying.
-- * You can remove or modify this trigger if you prefer to manage profiles from the app.
