-- selector_kind is a category label (e.g. "testid", "role", "css"), not
-- account-identifying data — safe to include in the shared aggregate so
-- consumers don't have to guess or fabricate it. Deterministic per selector
-- string, so MAX() just picks the (only) value consistently.
ALTER TABLE public.selector_memory_shared
  ADD COLUMN IF NOT EXISTS selector_kind text;

CREATE OR REPLACE FUNCTION public.refresh_selector_memory_shared()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE public.selector_memory_shared;

  INSERT INTO public.selector_memory_shared (target_host, selector, selector_kind, contributor_count, success_count, failure_count, updated_at)
  SELECT
    sm.target_host,
    sm.selector,
    MAX(sm.selector_kind) AS selector_kind,
    COUNT(DISTINCT sm.user_id) AS contributor_count,
    SUM(sm.success_count) AS success_count,
    SUM(sm.failure_count) AS failure_count,
    now()
  FROM public.selector_memory sm
  JOIN public.profiles p ON p.id = sm.user_id
  WHERE p.share_selector_memory = true
  GROUP BY sm.target_host, sm.selector;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_selector_memory_shared() FROM PUBLIC, anon, authenticated;
