-- 017_hardening.sql
--
-- Findings from the Supabase advisors once 013–016 were applied.

-- Trigger functions: pin search_path so a role that creates objects in its
-- own schema cannot shadow now() or anything else they resolve.
ALTER FUNCTION set_costumes_updated_at() SET search_path = '';
ALTER FUNCTION set_animation_clips_updated_at() SET search_path = '';
ALTER FUNCTION set_entities_updated_at() SET search_path = '';

-- Foreign keys without a covering index: ON DELETE of a scene or a rig
-- would otherwise scan the whole referencing table.
CREATE INDEX IF NOT EXISTS idx_entities_last_scene_id ON entities(last_scene_id);
CREATE INDEX IF NOT EXISTS idx_animation_clips_rig_id ON animation_clips(rig_id);

-- One SELECT policy instead of two permissive ones evaluated on every row.
-- Same rows as before: the active public catalogue for everyone, plus the
-- caller's own clips (auth.uid() is NULL for anon, so that half never matches).
DROP POLICY IF EXISTS "Anyone can view the active public catalogue" ON animation_clips;
DROP POLICY IF EXISTS "Owners can view their clips" ON animation_clips;
DROP POLICY IF EXISTS "View public catalogue and own clips" ON animation_clips;
CREATE POLICY "View public catalogue and own clips"
  ON animation_clips FOR SELECT
  USING ((owner_id IS NULL AND is_active) OR (SELECT auth.uid()) = owner_id);
