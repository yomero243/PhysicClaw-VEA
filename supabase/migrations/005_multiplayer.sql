-- 005_multiplayer.sql
-- Adds multiplayer presence and physics event tables.
-- Idempotent: every statement uses IF NOT EXISTS / DO $$ blocks.

-- ── session_users: real-time presence of users in a scene session ─────────────
CREATE TABLE IF NOT EXISTS session_users (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   uuid REFERENCES sessions(id) ON DELETE CASCADE,
    user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    avatar_id    text,
    position     jsonb NOT NULL DEFAULT '[0,0,0]',
    rotation     jsonb NOT NULL DEFAULT '[0,0,1]',
    last_seen_at timestamptz DEFAULT now(),
    joined_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_users_session_id ON session_users(session_id);
CREATE INDEX IF NOT EXISTS idx_session_users_user_id    ON session_users(user_id);
-- Compound index for the common "active users in session" query
CREATE INDEX IF NOT EXISTS idx_session_users_session_last_seen
    ON session_users(session_id, last_seen_at DESC);

-- ── physics_events: log of physics events emitted by users in a scene ─────────
CREATE TABLE IF NOT EXISTS physics_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id   uuid REFERENCES scenes(id) ON DELETE CASCADE,
    user_id    uuid REFERENCES auth.users(id),
    -- Allowed: object_spawn | object_move | object_delete | avatar_move | avatar_emote
    event_type text NOT NULL,
    payload    jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_physics_events_scene_id   ON physics_events(scene_id);
CREATE INDEX IF NOT EXISTS idx_physics_events_user_id    ON physics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_physics_events_created_at ON physics_events(created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE session_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE physics_events  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- session_users: owner can manage their own row; others can read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'session_users_owner') THEN
        CREATE POLICY session_users_owner ON session_users
            FOR ALL USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'session_users_read') THEN
        CREATE POLICY session_users_read ON session_users
            FOR SELECT TO authenticated
            USING (true);
    END IF;

    -- physics_events: any authenticated user in the scene can insert/read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'physics_events_insert') THEN
        CREATE POLICY physics_events_insert ON physics_events
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'physics_events_read') THEN
        CREATE POLICY physics_events_read ON physics_events
            FOR SELECT TO authenticated
            USING (true);
    END IF;
END $$;
