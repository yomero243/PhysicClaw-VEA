-- 016_entities.sql
--
-- One table for every tenant's entities. An entity is an agent's body: how it
-- looks, how it idles, and where it was last. One active entity per account;
-- tenancy is the owner_id column plus RLS, the same shared project for all.
--
-- Data, never files and never secrets:
--   • `form` is VEA perZona's avatar config (< 1 kB of choices and numbers);
--     both apps rebuild the body from it. NULL means the procedural aura.
--   • No API keys, tokens or credentials of any kind live here or anywhere in
--     this schema. A user's LLM key stays in their personal .env.
--
-- Replaces avatar_configs (PhysicClaw) and perzona_avatars (perZona, if it was
-- ever created). Their rows are carried over below, then both are dropped.

CREATE TABLE IF NOT EXISTS entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My entity' CHECK (char_length(name) BETWEEN 1 AND 64),

  -- Appearance ---------------------------------------------------------------
  form jsonb CHECK (form IS NULL OR pg_column_size(form) <= 16384),
  -- PhysicClaw look: { colors: {...}, shader: {...} } from the panel.
  look jsonb NOT NULL DEFAULT '{}' CHECK (pg_column_size(look) <= 8192),
  -- An animation_clips name. Text, not a FK: clips are public or per owner.
  idle_clip text NOT NULL DEFAULT 'idle_breathe' CHECK (char_length(idle_clip) BETWEEN 1 AND 64),
  default_mood text NOT NULL DEFAULT 'calm'
    CHECK (default_mood IN ('calm', 'excited', 'thinking', 'listening')),

  -- Where it was last: restored when the owner comes back ---------------------
  last_scene_id uuid REFERENCES scenes(id) ON DELETE SET NULL,
  last_position jsonb CHECK (last_position IS NULL OR (
    jsonb_typeof(last_position) = 'array' AND jsonb_array_length(last_position) = 3)),
  last_rotation jsonb CHECK (last_rotation IS NULL OR (
    jsonb_typeof(last_rotation) = 'array' AND jsonb_array_length(last_rotation) = 3)),
  last_seen_at timestamptz,

  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT entities_owner_name_key UNIQUE (owner_id, name)
);

-- One active entity per account: "one agent, one entity".
CREATE UNIQUE INDEX IF NOT EXISTS uq_entities_one_active_per_owner
  ON entities(owner_id) WHERE is_active;

CREATE OR REPLACE FUNCTION set_entities_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entities_set_updated_at ON entities;
CREATE TRIGGER entities_set_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE PROCEDURE set_entities_updated_at();

-- ─── RLS: the owner, and only the owner, reads and writes the row ───────────

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entities_owner_select ON entities;
CREATE POLICY entities_owner_select ON entities FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS entities_owner_insert ON entities;
CREATE POLICY entities_owner_insert ON entities FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS entities_owner_update ON entities;
CREATE POLICY entities_owner_update ON entities FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS entities_owner_delete ON entities;
CREATE POLICY entities_owner_delete ON entities FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- ─── What other tenants may see: appearance only ────────────────────────────
-- Entities meet in shared scenes, so others need to know how yours looks —
-- but not where you were last or when. This view is the one window onto other
-- people's rows; it deliberately omits every last_* column. It runs with the
-- view owner's rights (that is the point), so access is granted explicitly.

CREATE OR REPLACE VIEW entity_appearances AS
  SELECT id, owner_id, name, form, look, idle_clip, default_mood
  FROM entities
  WHERE is_active;

REVOKE ALL ON entity_appearances FROM PUBLIC;
REVOKE ALL ON entity_appearances FROM anon;
GRANT SELECT ON entity_appearances TO authenticated;

-- ─── Carry existing data over, then drop the old tables ─────────────────────

DO $$
BEGIN
  -- PhysicClaw panel settings → look (+ position as the last known spot).
  IF to_regclass('public.avatar_configs') IS NOT NULL THEN
    INSERT INTO entities (owner_id, name, look, last_position)
    SELECT DISTINCT ON (user_id)
           user_id,
           'My entity',
           jsonb_build_object('colors', custom_colors, 'shader', shader_params),
           CASE WHEN jsonb_typeof(position) = 'array' AND jsonb_array_length(position) = 3
                THEN position END
    FROM avatar_configs
    ORDER BY user_id, is_active DESC, updated_at DESC NULLS LAST
    ON CONFLICT (owner_id, name) DO NOTHING;

    DROP TABLE avatar_configs;
  END IF;

  -- perZona avatar config → form. Same account, same row.
  IF to_regclass('public.perzona_avatars') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO entities (owner_id, name, form)
      SELECT DISTINCT ON (user_id) user_id, 'My entity', config
      FROM perzona_avatars
      ORDER BY user_id, is_active DESC, updated_at DESC NULLS LAST
      ON CONFLICT (owner_id, name) DO UPDATE SET form = EXCLUDED.form
    $sql$;

    DROP TABLE perzona_avatars;
  END IF;
END $$;
