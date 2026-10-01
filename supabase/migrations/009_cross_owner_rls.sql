-- 009_cross_owner_rls.sql
-- Prevents authenticated users from linking their own rows to another user's
-- scenes or sessions. This closes cross-owner writes in client-side APIs.

CREATE OR REPLACE FUNCTION public.owns_scene(
    target_scene_id uuid,
    target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT target_scene_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.scenes s
            WHERE s.id = target_scene_id
              AND s.user_id = target_user_id
        );
$$;

CREATE OR REPLACE FUNCTION public.owns_session(
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
        FROM public.sessions s
        WHERE s.id = target_session_id
          AND s.user_id = target_user_id
    );
$$;

-- Scenes remain owner-writable, but scene participants may read scenes they
-- legitimately joined through a session.
DROP POLICY IF EXISTS scenes_read_accessible ON public.scenes;
CREATE POLICY scenes_read_accessible ON public.scenes
    FOR SELECT TO authenticated
    USING (public.can_access_scene(id, auth.uid()));

-- Sessions may only be created or moved onto scenes owned by the caller.
DROP POLICY IF EXISTS sessions_owner ON public.sessions;
DROP POLICY IF EXISTS sessions_select_accessible ON public.sessions;
DROP POLICY IF EXISTS sessions_insert_owned_scene ON public.sessions;
DROP POLICY IF EXISTS sessions_update_owned_scene ON public.sessions;
DROP POLICY IF EXISTS sessions_delete_owner ON public.sessions;

CREATE POLICY sessions_select_accessible ON public.sessions
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (
            scene_id IS NOT NULL
            AND public.can_access_scene(scene_id, auth.uid())
        )
    );

CREATE POLICY sessions_insert_owned_scene ON public.sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.owns_scene(scene_id, auth.uid())
    );

CREATE POLICY sessions_update_owned_scene ON public.sessions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND public.owns_scene(scene_id, auth.uid())
    );

CREATE POLICY sessions_delete_owner ON public.sessions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Scene objects may be read by scene participants, but writes must belong to
-- the caller and target an accessible scene.
DROP POLICY IF EXISTS scene_objects_owner ON public.scene_objects;
DROP POLICY IF EXISTS scene_objects_select_accessible ON public.scene_objects;
DROP POLICY IF EXISTS scene_objects_insert_accessible ON public.scene_objects;
DROP POLICY IF EXISTS scene_objects_update_accessible ON public.scene_objects;
DROP POLICY IF EXISTS scene_objects_delete_owner ON public.scene_objects;

CREATE POLICY scene_objects_select_accessible ON public.scene_objects
    FOR SELECT TO authenticated
    USING (public.can_access_scene(scene_id, auth.uid()));

CREATE POLICY scene_objects_insert_accessible ON public.scene_objects
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.can_access_scene(scene_id, auth.uid())
    );

CREATE POLICY scene_objects_update_accessible ON public.scene_objects
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id
        AND public.can_access_scene(scene_id, auth.uid())
    )
    WITH CHECK (
        auth.uid() = user_id
        AND public.can_access_scene(scene_id, auth.uid())
    );

CREATE POLICY scene_objects_delete_owner ON public.scene_objects
    FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id
        AND public.can_access_scene(scene_id, auth.uid())
    );

-- Users may only persist presence rows for sessions they own. Future invite or
-- room-membership support should add an explicit membership table and policy.
DROP POLICY IF EXISTS session_users_owner ON public.session_users;
DROP POLICY IF EXISTS session_users_read ON public.session_users;
DROP POLICY IF EXISTS session_users_select_participants ON public.session_users;
DROP POLICY IF EXISTS session_users_insert_owned_session ON public.session_users;
DROP POLICY IF EXISTS session_users_update_owned_session ON public.session_users;
DROP POLICY IF EXISTS session_users_delete_owner ON public.session_users;

CREATE POLICY session_users_select_participants ON public.session_users
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR public.is_session_participant(session_id, auth.uid())
    );

CREATE POLICY session_users_insert_owned_session ON public.session_users
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND public.owns_session(session_id, auth.uid())
    );

CREATE POLICY session_users_update_owned_session ON public.session_users
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND public.owns_session(session_id, auth.uid())
    );

CREATE POLICY session_users_delete_owner ON public.session_users
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Messages cannot be attached to someone else's session by setting only the
-- caller's user_id. This covers the session_id column added in migration 008.
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
DROP POLICY IF EXISTS messages_select_accessible ON public.messages;
DROP POLICY IF EXISTS messages_insert_owned_session ON public.messages;
DROP POLICY IF EXISTS messages_update_owned_session ON public.messages;
DROP POLICY IF EXISTS messages_delete_owner ON public.messages;

CREATE POLICY messages_select_accessible ON public.messages
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (
            session_id IS NOT NULL
            AND public.is_session_participant(session_id, auth.uid())
        )
    );

CREATE POLICY messages_insert_owned_session ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND (
            session_id IS NULL
            OR public.owns_session(session_id, auth.uid())
            OR public.is_session_participant(session_id, auth.uid())
        )
    );

CREATE POLICY messages_update_owned_session ON public.messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND (
            session_id IS NULL
            OR public.owns_session(session_id, auth.uid())
            OR public.is_session_participant(session_id, auth.uid())
        )
    );

CREATE POLICY messages_delete_owner ON public.messages
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
