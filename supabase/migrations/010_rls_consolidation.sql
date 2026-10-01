-- 010_rls_consolidation.sql
-- Consolidates the RLS policies that exist on the live project as of 2026-07:
--   * Removes the hand-created "Allow guest and owners ..." policies that
--     duplicated the owner policies (advisor: multiple_permissive_policies).
--     The guest zero-UUID escape hatch predates anonymous auth; every client
--     now signs in via signInAnon and has a real auth.uid().
--   * Recreates each owner policy with (SELECT auth.uid()) so the function is
--     evaluated once per statement instead of once per row (advisor:
--     auth_rls_initplan), and scopes it TO authenticated instead of public.
--   * Adds the missing covering index for sessions.scene_id (advisor:
--     unindexed_foreign_keys).
--
-- NOTE: migrations 005-009 have not been applied to the live project. If they
-- are synced later, 009 must also drop messages_owner/scene_objects_owner/
-- sessions_owner before creating its finer-grained policies.

-- profiles --------------------------------------------------------
DROP POLICY IF EXISTS profiles_owner ON public.profiles;
CREATE POLICY profiles_owner ON public.profiles
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- scenes ----------------------------------------------------------
DROP POLICY IF EXISTS scenes_owner ON public.scenes;
DROP POLICY IF EXISTS "Allow guest and owners to insert scenes" ON public.scenes;
DROP POLICY IF EXISTS "Allow guest and owners to view scenes" ON public.scenes;
DROP POLICY IF EXISTS "Allow guest and owners to update scenes" ON public.scenes;
CREATE POLICY scenes_owner ON public.scenes
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- objects_3d ------------------------------------------------------
DROP POLICY IF EXISTS objects_3d_owner ON public.objects_3d;
DROP POLICY IF EXISTS "Allow guest and owners to manage objects_3d" ON public.objects_3d;
CREATE POLICY objects_3d_owner ON public.objects_3d
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- scene_objects ---------------------------------------------------
DROP POLICY IF EXISTS scene_objects_owner ON public.scene_objects;
DROP POLICY IF EXISTS "Allow guest and owners to manage objects" ON public.scene_objects;
CREATE POLICY scene_objects_owner ON public.scene_objects
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- sessions --------------------------------------------------------
DROP POLICY IF EXISTS sessions_owner ON public.sessions;
CREATE POLICY sessions_owner ON public.sessions
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- messages --------------------------------------------------------
DROP POLICY IF EXISTS messages_owner ON public.messages;
CREATE POLICY messages_owner ON public.messages
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- avatar_configs ---------------------------------------------------
DROP POLICY IF EXISTS avatar_configs_owner ON public.avatar_configs;
CREATE POLICY avatar_configs_owner ON public.avatar_configs
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Covering index for sessions.scene_id FK -------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_scene_id ON public.sessions (scene_id);
