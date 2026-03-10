-- Auto-create a profile row when a new user signs up.
-- This ensures OAuth users (Google, Apple) have a profile row
-- immediately, which is needed for RLS policies and the
-- onboarding flow check in the app.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
