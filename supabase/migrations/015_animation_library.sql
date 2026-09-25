-- Moved from VEA-perZona/supabase/migrations/004_animation_library.sql so this repository owns
-- the whole schema of the shared project (both repos numbered from 001, so
-- `supabase db push` from each would collide). Idempotent: safe to run even
-- if the original was already applied by hand.

-- VEA-perzona — Rig and animation library
--
-- Every clip in the library is stored already normalised to the canonical
-- 'standard' rig (VEA-perZona/src/avatar/skeleton.ts), so nothing downstream — perZona's
-- preview, PhysicClaw, an agent — ever retargets at runtime. Normalising
-- happens once, on ingest, through `rigs.source_map`; the clip then has to
-- pass VEA-perZona/src/avatar/animation/verifyClip.ts, whose report is kept alongside it.
--
-- A clip is either a file in Storage or code: `generator` names a function
-- the client ships (e.g. 'idle_breathe' → buildIdleClip), with its params.

-- ─── Rigs ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rigs (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_]{1,31}$'),
  label text NOT NULL,
  -- The rig's own bone names.
  bone_names text[] NOT NULL,
  -- Source bone name → standard bone name. Data, not code: supporting a new
  -- rig is a row, not a release. Empty for 'standard' itself.
  source_map jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rigs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view rigs" ON rigs;
CREATE POLICY "Anyone can view rigs"
  ON rigs FOR SELECT
  USING (true);

-- No write policy: rigs are authored through the service role only.

-- ─── Clips ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS animation_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  -- 'idle', 'walk', 'wave' …  what the clip is.
  tags text[] NOT NULL DEFAULT '{}',
  -- PhysicClaw moods this clip suits, so an agent can ask for "a clip for
  -- thinking" without knowing files. Same values as VALID_MOODS there.
  moods text[] NOT NULL DEFAULT '{}'
    CHECK (moods <@ ARRAY['calm', 'excited', 'thinking', 'listening']::text[]),
  -- Always the rig the clip is STORED in. Only 'standard' is accepted today.
  rig_id text NOT NULL DEFAULT 'standard' REFERENCES rigs(id) CHECK (rig_id = 'standard'),
  -- Exactly one of: a file in Storage, or a named generator.
  storage_path text,
  generator text,
  generator_params jsonb NOT NULL DEFAULT '{}',
  duration_s real CHECK (duration_s IS NULL OR duration_s > 0),
  loops bool NOT NULL DEFAULT false,
  source text NOT NULL CHECK (source IN ('procedural', 'upload', 'cc0', 'mocap', 'keyframed')),
  -- SPDX id or 'owned' (made by us). Never 'mixamo' in the public catalogue:
  -- Mixamo files may be used but not redistributed.
  license text NOT NULL,
  -- NULL = public catalogue (service role only). A uid = that user's private clip.
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  -- verifyClip's ClipReport for this exact clip.
  verify_report jsonb,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT animation_clips_one_source
    CHECK ((storage_path IS NULL) <> (generator IS NULL)),
  -- A clip that failed verification is kept for debugging but never served.
  CONSTRAINT animation_clips_active_means_verified
    CHECK (NOT is_active OR (verify_report ->> 'ok')::bool IS TRUE),
  CONSTRAINT animation_clips_public_is_redistributable
    CHECK (owner_id IS NOT NULL OR license <> 'mixamo')
);

CREATE INDEX IF NOT EXISTS idx_animation_clips_owner ON animation_clips(owner_id);
CREATE INDEX IF NOT EXISTS idx_animation_clips_tags ON animation_clips USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_animation_clips_moods ON animation_clips USING gin(moods);
-- Names are unique within the public catalogue and within each user's clips.
CREATE UNIQUE INDEX IF NOT EXISTS uq_animation_clips_public_name
  ON animation_clips(name) WHERE owner_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_animation_clips_owner_name
  ON animation_clips(owner_id, name) WHERE owner_id IS NOT NULL;

CREATE OR REPLACE FUNCTION set_animation_clips_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS animation_clips_set_updated_at ON animation_clips;
CREATE TRIGGER animation_clips_set_updated_at
  BEFORE UPDATE ON animation_clips
  FOR EACH ROW EXECUTE PROCEDURE set_animation_clips_updated_at();

-- RLS: the active public catalogue is readable by all; private clips only by
-- their owner, who may also manage them. Public rows: service role only.
ALTER TABLE animation_clips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view the active public catalogue" ON animation_clips;
CREATE POLICY "Anyone can view the active public catalogue"
  ON animation_clips FOR SELECT
  USING (owner_id IS NULL AND is_active);

DROP POLICY IF EXISTS "Owners can view their clips" ON animation_clips;
CREATE POLICY "Owners can view their clips"
  ON animation_clips FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can add their clips" ON animation_clips;
CREATE POLICY "Owners can add their clips"
  ON animation_clips FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can update their clips" ON animation_clips;
CREATE POLICY "Owners can update their clips"
  ON animation_clips FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can delete their clips" ON animation_clips;
CREATE POLICY "Owners can delete their clips"
  ON animation_clips FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- ─── Seed ────────────────────────────────────────────────────────────────────

INSERT INTO rigs (id, label, bone_names, source_map) VALUES
  ('standard', 'VEA standard (22 bones)',
   ARRAY['Hips','Spine','Spine1','Spine2','Neck','Head',
         'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
         'RightShoulder','RightArm','RightForeArm','RightHand',
         'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
         'RightUpLeg','RightLeg','RightFoot','RightToeBase'],
   '{}'),
  -- Mixamo names are the standard ones behind a 'mixamorig:' prefix, which
  -- GLTFLoader sanitises to 'mixamorig' (the ':' is reserved in track names).
  ('mixamo', 'Mixamo',
   ARRAY['mixamorig:Hips','mixamorig:Spine','mixamorig:Spine1','mixamorig:Spine2',
         'mixamorig:Neck','mixamorig:Head',
         'mixamorig:LeftShoulder','mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:LeftHand',
         'mixamorig:RightShoulder','mixamorig:RightArm','mixamorig:RightForeArm','mixamorig:RightHand',
         'mixamorig:LeftUpLeg','mixamorig:LeftLeg','mixamorig:LeftFoot','mixamorig:LeftToeBase',
         'mixamorig:RightUpLeg','mixamorig:RightLeg','mixamorig:RightFoot','mixamorig:RightToeBase'],
   (SELECT jsonb_object_agg(src, dst) FROM (
      SELECT prefix || b AS src, b AS dst
      FROM unnest(ARRAY['Hips','Spine','Spine1','Spine2','Neck','Head',
                        'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
                        'RightShoulder','RightArm','RightForeArm','RightHand',
                        'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
                        'RightUpLeg','RightLeg','RightFoot','RightToeBase']) AS b,
           unnest(ARRAY['mixamorig:', 'mixamorig']) AS prefix
   ) m))
ON CONFLICT (id) DO NOTHING;

-- The first clip we own. Generated in the client by buildIdleClip(); the
-- report is what verifyClip returns for it (see VEA-perZona animation.test.ts).
INSERT INTO animation_clips
  (name, tags, moods, generator, generator_params, duration_s, loops,
   source, license, verify_report)
VALUES
  ('idle_breathe', ARRAY['idle'], ARRAY['calm', 'listening'],
   'idle_breathe', '{"breathSeconds": 4, "amplitude": 1}', 8, true,
   'procedural', 'owned',
   '{"ok": true, "issues": [], "bonesCovered": 22, "maxBoneStretch": 0.013, "verifier": "perzona/verifyClip v1"}')
ON CONFLICT DO NOTHING;
