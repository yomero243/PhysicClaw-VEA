-- entity_appearances ran with its owner's rights so other tenants could read
-- how an entity looks. Nothing reads it yet, and Supabase's advisor flags any
-- SECURITY DEFINER view as critical. Drop it until a client needs it, then
-- expose appearance through a security-invoker path instead.
DROP VIEW IF EXISTS public.entity_appearances;
