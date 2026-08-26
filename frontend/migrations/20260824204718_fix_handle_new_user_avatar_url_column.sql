-- Captures a fix that was already applied directly to the linked Supabase
-- project (via the SQL editor, not through this migrations/ directory) —
-- this file exists so the repo can reproduce prod schema from scratch.
-- Applied version: 20260824204718 (see `supabase migration list --linked`
-- or the Supabase dashboard's migration history for this project).
--
-- handle_new_user() is the trigger function that creates a public.profiles
-- row whenever a new user signs up (auth.users insert). It previously
-- referenced an avatar_url column that doesn't exist on public.profiles,
-- which made every new signup fail with a database error at the trigger
-- level. This fix drops that reference so the row is created with only the
-- columns that actually exist.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$function$;

-- The trigger itself (on auth.users) also predates this migrations/
-- directory and isn't captured anywhere else in the repo. Re-declaring it
-- here, alongside the function it depends on, so this file is a complete,
-- runnable unit against a fresh project.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
