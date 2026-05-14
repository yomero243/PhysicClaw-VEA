-- 006_security_hardening.sql
-- Tightens multiplayer RLS so authenticated users only read/write scene data
-- for sessions/scenes they own or have joined.

CREATE OR REPLACE FUNCTION public.is_session_participant(
    target_session_id uuid,
    target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.session_users su
        WHERE su.session_id = target_session_id
          AND su.user_id = target_user_id
    )
    OR EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.id = target_session_id
          AND s.user_id = target_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_scene(
    target_scene_id uuid,
    target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.scenes s
        WHERE s.id = target_scene_id
          AND s.user_id = target_user_id
    )
    OR EXISTS (
        SELECT 1
        FROM public.session_users su
        JOIN public.sessions s ON s.id = su.session_id
        WHERE s.scene_id = target_scene_id
          AND su.user_id = target_user_id
    );
$$;

DROP POLICY IF EXISTS session_users_read ON public.session_users;
CREATE POLICY session_users_read ON public.session_users
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR public.is_session_participant(session_id, auth.uid())
    );

DROP POLICY IF EXISTS physics_events_insert ON public.physics_events;
CREATE POLICY physics_events_insert ON public.physics_events
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.can_access_scene(scene_id, auth.uid())
    );

DROP POLICY IF EXISTS physics_events_read ON public.physics_events;
CREATE POLICY physics_events_read ON public.physics_events
    FOR SELECT TO authenticated
    USING (public.can_access_scene(scene_id, auth.uid()));
