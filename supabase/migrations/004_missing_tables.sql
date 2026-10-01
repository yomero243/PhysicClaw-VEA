-- 004_missing_tables.sql
-- Creates tables that database.ts / supabase.ts expect but 001 never created.
-- Idempotent: every statement uses IF NOT EXISTS.

-- ── scene_objects (code references this, not objects_3d) ─────────────────────
CREATE TABLE IF NOT EXISTS scene_objects (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id   uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    object_type text NOT NULL DEFAULT 'prop',
    character_id uuid,
    label       text,
    model_url   text,
    position    jsonb NOT NULL DEFAULT '[0,0,0]',
    rotation    jsonb NOT NULL DEFAULT '[0,0,0]',
    scale_v     jsonb NOT NULL DEFAULT '[1,1,1]',
    metadata    jsonb NOT NULL DEFAULT '{}',
    sort_order  int  NOT NULL DEFAULT 0,
    is_visible  boolean NOT NULL DEFAULT true,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scene_objects_scene_id ON scene_objects(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_objects_user_id  ON scene_objects(user_id);

-- ── sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id   uuid,
    scene_id   uuid REFERENCES scenes(id) ON DELETE SET NULL,
    title      text,
    started_at timestamptz DEFAULT now(),
    ended_at   timestamptz,
    metadata   jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ── avatar_configs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avatar_configs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_id  uuid,
    config_name   text NOT NULL DEFAULT 'default',
    custom_colors jsonb NOT NULL DEFAULT '{}',
    shader_params jsonb NOT NULL DEFAULT '{}',
    scale         float,
    position      jsonb,
    extra         jsonb NOT NULL DEFAULT '{}',
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now(),
    UNIQUE(user_id, config_name)
);

CREATE INDEX IF NOT EXISTS idx_avatar_configs_user_id ON avatar_configs(user_id);

-- ── Add missing columns to scenes (TypeScript expects them) ──────────────────
DO $$ BEGIN
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS description       text;
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS environment       text NOT NULL DEFAULT 'city';
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS background_color  text NOT NULL DEFAULT '#111111';
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS camera_position   jsonb NOT NULL DEFAULT '[0,0,5]';
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS camera_fov        float NOT NULL DEFAULT 45;
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS ambient_intensity float NOT NULL DEFAULT 0.5;
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS lighting_config   jsonb NOT NULL DEFAULT '{}';
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS is_default        boolean NOT NULL DEFAULT false;
    ALTER TABLE scenes ADD COLUMN IF NOT EXISTS thumbnail_url     text;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE scene_objects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- scene_objects
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'scene_objects_owner') THEN
        CREATE POLICY scene_objects_owner ON scene_objects
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    -- sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sessions_owner') THEN
        CREATE POLICY sessions_owner ON sessions
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    -- avatar_configs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatar_configs_owner') THEN
        CREATE POLICY avatar_configs_owner ON avatar_configs
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ── Supabase Storage bucket for GLB uploads ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'models_upload') THEN
        CREATE POLICY models_upload ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'models' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'models_read') THEN
        CREATE POLICY models_read ON storage.objects
            FOR SELECT TO public
            USING (bucket_id = 'models');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'models_delete') THEN
        CREATE POLICY models_delete ON storage.objects
            FOR DELETE TO authenticated
            USING (bucket_id = 'models' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;
