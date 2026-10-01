-- ============================================================
-- Migration 003: Performance Indexes + user_preferences
-- PhysicClaw VEA v2.0
-- ============================================================
-- This migration is idempotent: all CREATE INDEX use IF NOT EXISTS
-- and ALTER TABLE column additions are guarded accordingly.
-- ============================================================


-- ------------------------------------------------------------
-- SECTION 1: Composite indexes for frequent (user_id + created_at) queries
-- These dramatically speed up paginated, time-sorted fetches per user.
-- ------------------------------------------------------------

-- scenes: list a user's scenes ordered by most recent
CREATE INDEX IF NOT EXISTS idx_scenes_user_id_created_at
  ON scenes(user_id, created_at DESC);

-- scenes: cover updated_at for "recently modified" queries
CREATE INDEX IF NOT EXISTS idx_scenes_user_id_updated_at
  ON scenes(user_id, updated_at DESC);

-- messages: list a user's messages in chronological order
-- (most common pattern: chat history feed per user)
CREATE INDEX IF NOT EXISTS idx_messages_user_id_created_at
  ON messages(user_id, created_at DESC);

-- messages: list messages in a specific scene ordered by time
-- (second most common pattern: in-scene chat replay)
CREATE INDEX IF NOT EXISTS idx_messages_scene_id_created_at
  ON messages(scene_id, created_at ASC);

-- objects_3d: list objects in a scene, sorted by insertion order
-- (used when reconstructing a scene's object list)
CREATE INDEX IF NOT EXISTS idx_objects_3d_scene_id_created_at
  ON objects_3d(scene_id, created_at ASC);

-- objects_3d: list all objects owned by a user across scenes
CREATE INDEX IF NOT EXISTS idx_objects_3d_user_id_created_at
  ON objects_3d(user_id, created_at DESC);


-- ------------------------------------------------------------
-- SECTION 2: Single-column indexes for FK look-ups not covered above
-- (Some of these were already added in 001, kept here with IF NOT EXISTS
--  to make this migration safely re-runnable after a reset.)
-- ------------------------------------------------------------

-- scenes: fast look-up by user (base FK index)
CREATE INDEX IF NOT EXISTS idx_scenes_user_id
  ON scenes(user_id);

-- objects_3d: fast look-up by scene (FK cascade deletes + SELECTs)
CREATE INDEX IF NOT EXISTS idx_objects_3d_scene_id
  ON objects_3d(scene_id);

-- objects_3d: fast look-up by user
CREATE INDEX IF NOT EXISTS idx_objects_3d_user_id
  ON objects_3d(user_id);

-- messages: fast look-up by user
CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON messages(user_id);

-- messages: fast look-up by scene
CREATE INDEX IF NOT EXISTS idx_messages_scene_id
  ON messages(scene_id);


-- ------------------------------------------------------------
-- SECTION 3: Partial index — only index messages from 'user' role
-- Useful for analytics queries that only care about human turns.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messages_user_role
  ON messages(user_id, created_at DESC)
  WHERE role = 'user';


-- ------------------------------------------------------------
-- SECTION 4: objects_3d — index on object_type for filtering
-- Allows efficient queries like: "show all GLB objects in this scene"
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_objects_3d_scene_id_type
  ON objects_3d(scene_id, object_type);


-- ------------------------------------------------------------
-- SECTION 5: user_preferences table
-- Not present in prior migrations; created here for the first time.
-- Stores per-user application preferences with sensible defaults.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- UI scaling factor (1.0 = 100%, supports accessibility zoom)
  ui_scale     float NOT NULL DEFAULT 1.0,

  -- Whether the user wants in-app notifications
  notifications_enabled boolean NOT NULL DEFAULT true,

  -- Reserved JSONB bucket for future preference expansion
  -- without requiring additional schema migrations
  extra        jsonb DEFAULT '{}',

  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Index: look up preferences by user_id (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences(user_id);

-- RLS: enable row-level security so users can only touch their own row
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- SECTION 6: Guard — add columns to user_preferences if the table
-- existed before this migration but lacks the new columns.
-- (Safe no-op if this migration runs on a fresh DB.)
-- ------------------------------------------------------------
DO $$
BEGIN
  -- ui_scale column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name  = 'user_preferences'
       AND column_name = 'ui_scale'
  ) THEN
    ALTER TABLE user_preferences
      ADD COLUMN ui_scale float NOT NULL DEFAULT 1.0;
  END IF;

  -- notifications_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name  = 'user_preferences'
       AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE user_preferences
      ADD COLUMN notifications_enabled boolean NOT NULL DEFAULT true;
  END IF;
END
$$;


-- ------------------------------------------------------------
-- SECTION 7: Auto-create user_preferences row on new user sign-up
-- Mirrors the pattern used in 002 for profiles.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first to make this idempotent across re-runs
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;

CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user_preferences();
