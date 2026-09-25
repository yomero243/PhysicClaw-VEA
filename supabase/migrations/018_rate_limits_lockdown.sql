-- 018_rate_limits_lockdown.sql
--
-- rate_limits is service-role-only (011). Until now that rested on RLS
-- alone, while anon and authenticated still held every table privilege,
-- TRUNCATE included, which RLS does not govern. Close it at every layer:
--
--   1. privileges: clients hold none on the table;
--   2. RLS: an explicit deny policy states the intent (and is what the
--      advisor's "RLS enabled, no policy" note asks for);
--   3. the function runs as its caller: only service_role may execute it
--      and service_role bypasses RLS, so SECURITY DEFINER bought nothing
--      but surface.

REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limits TO service_role;

DROP POLICY IF EXISTS rate_limits_no_client_access ON public.rate_limits;
CREATE POLICY rate_limits_no_client_access ON public.rate_limits
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

ALTER TABLE public.rate_limits
  DROP CONSTRAINT IF EXISTS rate_limits_count_nonnegative,
  ADD CONSTRAINT rate_limits_count_nonnegative CHECK (count >= 0),
  DROP CONSTRAINT IF EXISTS rate_limits_key_length,
  ADD CONSTRAINT rate_limits_key_length CHECK (char_length(key) BETWEEN 1 AND 200);

ALTER FUNCTION public.consume_rate_limit(text, integer, integer) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer)
  TO service_role;
