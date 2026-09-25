-- Baseline: the whole schema of the shared VEA Supabase project, as it
-- stood in production on 2026-09-25. It replaces migrations 001–018, which
-- had drifted from production (some applied by hand under other names, some
-- never applied). Generated from the live catalog, not from those files.
--
-- A new project runs this once. Changes after it are new files with a later
-- timestamp; never edit this one.
--
-- Tenancy: one project, many accounts, isolated by RLS on owner columns.
-- Secrets: none live in this schema. Agent tokens are stored as SHA-256
-- hashes; LLM keys stay in each user's personal .env.

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username)
);

CREATE TABLE public.scenes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text DEFAULT 'My Scene'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  environment text DEFAULT 'city'::text NOT NULL,
  background_color text DEFAULT '#111111'::text NOT NULL,
  camera_position jsonb DEFAULT '[0, 0, 5]'::jsonb NOT NULL,
  camera_fov double precision DEFAULT 45 NOT NULL,
  ambient_intensity double precision DEFAULT 0.5 NOT NULL,
  lighting_config jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  thumbnail_url text,
  CONSTRAINT scenes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.scene_objects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  scene_id uuid NOT NULL,
  user_id uuid NOT NULL,
  object_type text DEFAULT 'prop'::text NOT NULL,
  character_id uuid,
  label text,
  model_url text,
  "position" jsonb DEFAULT '[0, 0, 0]'::jsonb NOT NULL,
  rotation jsonb DEFAULT '[0, 0, 0]'::jsonb NOT NULL,
  scale_v jsonb DEFAULT '[1, 1, 1]'::jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scene_objects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.objects_3d (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  scene_id uuid NOT NULL,
  user_id uuid NOT NULL,
  model_url text,
  object_type text DEFAULT 'glb'::text,
  "position" jsonb DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  rotation jsonb DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  scale jsonb DEFAULT '{"x": 1, "y": 1, "z": 1}'::jsonb,
  shader_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  label text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  scale_v jsonb DEFAULT '[1, 1, 1]'::jsonb,
  CONSTRAINT objects_3d_pkey PRIMARY KEY (id)
);

CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  scene_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);

CREATE TABLE public.sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  agent_id uuid,
  scene_id uuid,
  title text,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

-- Agents: only a SHA-256 of the token is kept; the plaintext is shown once.
CREATE TABLE public.agent_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_used_at timestamp with time zone,
  revoked boolean DEFAULT false NOT NULL,
  CONSTRAINT agent_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT agent_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT agent_tokens_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 60))),
  CONSTRAINT agent_tokens_token_hash_check CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text))
);

-- Service role only: the control Edge Function's durable rate limiter.
CREATE TABLE public.rate_limits (
  key text NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  window_start timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rate_limits_pkey PRIMARY KEY (key),
  CONSTRAINT rate_limits_count_nonnegative CHECK ((count >= 0)),
  CONSTRAINT rate_limits_key_length CHECK (((char_length(key) >= 1) AND (char_length(key) <= 200)))
);

-- VEA perZona's wardrobe: presets the client knows how to build. No geometry.
CREATE TABLE public.costumes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slot text NOT NULL,
  label text,
  mesh_id text NOT NULL,
  color_slots jsonb DEFAULT '[]'::jsonb NOT NULL,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  rarity text,
  sort_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  author_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT costumes_pkey PRIMARY KEY (id),
  CONSTRAINT costumes_rarity_check CHECK (((rarity IS NULL) OR (rarity = ANY (ARRAY['common'::text, 'rare'::text, 'epic'::text, 'legendary'::text])))),
  CONSTRAINT costumes_slot_check CHECK ((slot = ANY (ARRAY['outfit'::text, 'shirt'::text, 'pants'::text, 'shoes'::text, 'gloves'::text, 'hat'::text, 'glasses'::text, 'earrings'::text, 'rings'::text, 'wrist'::text, 'prop'::text])))
);

-- Rigs and clips: every clip is stored normalised to the 'standard' rig and
-- must have passed perZona's verifyClip before it is served.
CREATE TABLE public.rigs (
  id text NOT NULL,
  label text NOT NULL,
  bone_names text[] NOT NULL,
  source_map jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rigs_pkey PRIMARY KEY (id),
  CONSTRAINT rigs_id_check CHECK ((id ~ '^[a-z][a-z0-9_]{1,31}$'::text))
);

CREATE TABLE public.animation_clips (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  moods text[] DEFAULT '{}'::text[] NOT NULL,
  rig_id text DEFAULT 'standard'::text NOT NULL,
  storage_path text,
  generator text,
  generator_params jsonb DEFAULT '{}'::jsonb NOT NULL,
  duration_s real,
  loops boolean DEFAULT false NOT NULL,
  source text NOT NULL,
  license text NOT NULL,
  owner_id uuid,
  verify_report jsonb,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT animation_clips_pkey PRIMARY KEY (id),
  CONSTRAINT animation_clips_active_means_verified CHECK (((NOT is_active) OR (((verify_report ->> 'ok'::text))::boolean IS TRUE))),
  CONSTRAINT animation_clips_duration_s_check CHECK (((duration_s IS NULL) OR (duration_s > (0)::double precision))),
  CONSTRAINT animation_clips_moods_check CHECK ((moods <@ ARRAY['calm'::text, 'excited'::text, 'thinking'::text, 'listening'::text])),
  CONSTRAINT animation_clips_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 64))),
  CONSTRAINT animation_clips_one_source CHECK (((storage_path IS NULL) <> (generator IS NULL))),
  CONSTRAINT animation_clips_public_is_redistributable CHECK (((owner_id IS NOT NULL) OR (license <> 'mixamo'::text))),
  CONSTRAINT animation_clips_rig_id_check CHECK ((rig_id = 'standard'::text)),
  CONSTRAINT animation_clips_source_check CHECK ((source = ANY (ARRAY['procedural'::text, 'upload'::text, 'cc0'::text, 'mocap'::text, 'keyframed'::text])))
);

-- One entity per account: its look (PhysicClaw), form (perZona), idle, mood
-- and last place. Data only, never files and never credentials.
CREATE TABLE public.entities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  name text DEFAULT 'My entity'::text NOT NULL,
  form jsonb,
  look jsonb DEFAULT '{}'::jsonb NOT NULL,
  idle_clip text DEFAULT 'idle_breathe'::text NOT NULL,
  default_mood text DEFAULT 'calm'::text NOT NULL,
  last_scene_id uuid,
  last_position jsonb,
  last_rotation jsonb,
  last_seen_at timestamp with time zone,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT entities_pkey PRIMARY KEY (id),
  CONSTRAINT entities_owner_name_key UNIQUE (owner_id, name),
  CONSTRAINT entities_default_mood_check CHECK ((default_mood = ANY (ARRAY['calm'::text, 'excited'::text, 'thinking'::text, 'listening'::text]))),
  CONSTRAINT entities_form_check CHECK (((form IS NULL) OR (pg_column_size(form) <= 16384))),
  CONSTRAINT entities_idle_clip_check CHECK (((char_length(idle_clip) >= 1) AND (char_length(idle_clip) <= 64))),
  CONSTRAINT entities_last_position_check CHECK (((last_position IS NULL) OR ((jsonb_typeof(last_position) = 'array'::text) AND (jsonb_array_length(last_position) = 3)))),
  CONSTRAINT entities_last_rotation_check CHECK (((last_rotation IS NULL) OR ((jsonb_typeof(last_rotation) = 'array'::text) AND (jsonb_array_length(last_rotation) = 3)))),
  CONSTRAINT entities_look_check CHECK ((pg_column_size(look) <= 8192)),
  CONSTRAINT entities_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 64)))
);

-- ─── Foreign keys ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.scene_objects ADD CONSTRAINT scene_objects_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;
ALTER TABLE public.scene_objects ADD CONSTRAINT scene_objects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.objects_3d ADD CONSTRAINT objects_3d_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.agent_tokens ADD CONSTRAINT agent_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.costumes ADD CONSTRAINT costumes_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.animation_clips ADD CONSTRAINT animation_clips_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.animation_clips ADD CONSTRAINT animation_clips_rig_id_fkey FOREIGN KEY (rig_id) REFERENCES public.rigs(id);
ALTER TABLE public.entities ADD CONSTRAINT entities_last_scene_id_fkey FOREIGN KEY (last_scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL;
ALTER TABLE public.entities ADD CONSTRAINT entities_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_scenes_user_id ON public.scenes USING btree (user_id);
CREATE INDEX idx_scene_objects_scene_id ON public.scene_objects USING btree (scene_id);
CREATE INDEX idx_scene_objects_user_id ON public.scene_objects USING btree (user_id);
CREATE INDEX idx_objects_3d_scene_id ON public.objects_3d USING btree (scene_id);
CREATE INDEX idx_objects_3d_user_id ON public.objects_3d USING btree (user_id);
CREATE INDEX idx_messages_scene_id ON public.messages USING btree (scene_id);
CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);
CREATE INDEX idx_sessions_scene_id ON public.sessions USING btree (scene_id);
CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);
CREATE INDEX agent_tokens_user_id_idx ON public.agent_tokens USING btree (user_id);
CREATE INDEX rate_limits_window_start_idx ON public.rate_limits USING btree (window_start);
CREATE INDEX idx_costumes_author_id ON public.costumes USING btree (author_id);
CREATE INDEX idx_costumes_is_active ON public.costumes USING btree (is_active);
CREATE INDEX idx_costumes_slot ON public.costumes USING btree (slot);
CREATE INDEX idx_costumes_slot_active_order ON public.costumes USING btree (slot, sort_order) WHERE is_active;
CREATE INDEX idx_costumes_tags ON public.costumes USING gin (tags);
CREATE INDEX idx_animation_clips_moods ON public.animation_clips USING gin (moods);
CREATE INDEX idx_animation_clips_owner ON public.animation_clips USING btree (owner_id);
CREATE INDEX idx_animation_clips_rig_id ON public.animation_clips USING btree (rig_id);
CREATE INDEX idx_animation_clips_tags ON public.animation_clips USING gin (tags);
CREATE UNIQUE INDEX uq_animation_clips_owner_name ON public.animation_clips USING btree (owner_id, name) WHERE (owner_id IS NOT NULL);
CREATE UNIQUE INDEX uq_animation_clips_public_name ON public.animation_clips USING btree (name) WHERE (owner_id IS NULL);
CREATE INDEX idx_entities_last_scene_id ON public.entities USING btree (last_scene_id);
-- "One agent, one entity": at most one active entity per account.
CREATE UNIQUE INDEX uq_entities_one_active_per_owner ON public.entities USING btree (owner_id) WHERE is_active;

-- ─── Functions and triggers ──────────────────────────────────────────────────

CREATE FUNCTION public.set_costumes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE FUNCTION public.set_animation_clips_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE FUNCTION public.set_entities_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER costumes_set_updated_at BEFORE UPDATE ON public.costumes FOR EACH ROW EXECUTE FUNCTION public.set_costumes_updated_at();
CREATE TRIGGER animation_clips_set_updated_at BEFORE UPDATE ON public.animation_clips FOR EACH ROW EXECUTE FUNCTION public.set_animation_clips_updated_at();
CREATE TRIGGER entities_set_updated_at BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.set_entities_updated_at();

-- Fixed-window counter shared by every Edge Function isolate. Runs as its
-- caller; only service_role may call it, and service_role bypasses RLS.
CREATE FUNCTION public.consume_rate_limit(p_key text, p_limit integer, p_window_ms integer)
 RETURNS TABLE(allowed boolean, retry_after_seconds integer)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    v_now    timestamptz := now();
    v_window interval;
    v_row    public.rate_limits;
begin
    if p_key is null or p_key = '' then
        raise exception 'consume_rate_limit: p_key must be non-empty';
    end if;
    if p_limit is null or p_limit <= 0 then
        raise exception 'consume_rate_limit: p_limit must be > 0 (got %)', p_limit;
    end if;
    if p_window_ms is null or p_window_ms <= 0 then
        raise exception 'consume_rate_limit: p_window_ms must be > 0 (got %)', p_window_ms;
    end if;
    v_window := make_interval(secs => p_window_ms / 1000.0);

    -- Opportunistic cleanup: drop keys idle for 2+ windows.
    -- Probabilistic (~1% of calls) so the hot path stays an indexed upsert.
    if random() < 0.01 then
        delete from public.rate_limits
         where window_start < v_now - (v_window * 2);
    end if;

    insert into public.rate_limits as rl (key, count, window_start)
    values (p_key, 1, v_now)
    on conflict (key) do update
        set count = case
                when rl.window_start < v_now - v_window then 1
                else rl.count + 1
            end,
            window_start = case
                when rl.window_start < v_now - v_window then v_now
                else rl.window_start
            end
    returning * into v_row;

    allowed := v_row.count <= p_limit;
    retry_after_seconds := case
        when allowed then 0
        else greatest(
            1,
            ceil(extract(epoch from (v_row.window_start + v_window - v_now)))::integer
        )
    end;
    return next;
end;
$function$;

-- ─── Cross-tenant window: how other entities look, never where they were ─────
-- Runs with the owner's rights on purpose (it is the one read of other
-- people's rows) and is read-only at every layer: SELECT is the only grant,
-- and rules turn any write into a no-op.

CREATE VIEW public.entity_appearances WITH (security_barrier = true) AS
 SELECT id,
    owner_id,
    name,
    form,
    look,
    idle_clip,
    default_mood
   FROM public.entities
  WHERE is_active;

CREATE RULE entity_appearances_no_insert AS ON INSERT TO public.entity_appearances DO INSTEAD NOTHING;
CREATE RULE entity_appearances_no_update AS ON UPDATE TO public.entity_appearances DO INSTEAD NOTHING;
CREATE RULE entity_appearances_no_delete AS ON DELETE TO public.entity_appearances DO INSTEAD NOTHING;

-- ─── Row level security ──────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects_3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animation_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- Owner-only tables.
CREATE POLICY profiles_owner ON public.profiles FOR ALL TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY scenes_owner ON public.scenes FOR ALL TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY scene_objects_owner ON public.scene_objects FOR ALL TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY objects_3d_owner ON public.objects_3d FOR ALL TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY messages_owner ON public.messages FOR ALL TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY sessions_owner ON public.sessions FOR ALL TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY agent_tokens_owner ON public.agent_tokens FOR ALL TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY entities_owner_select ON public.entities FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_id));
CREATE POLICY entities_owner_insert ON public.entities FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));
CREATE POLICY entities_owner_update ON public.entities FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));
CREATE POLICY entities_owner_delete ON public.entities FOR DELETE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_id));

-- Public catalogues: readable by all, written only through the service role.
CREATE POLICY "Anyone can view active costumes" ON public.costumes FOR SELECT TO public
  USING ((is_active = true));
CREATE POLICY "Anyone can view rigs" ON public.rigs FOR SELECT TO public
  USING (true);

-- Clips: the active public catalogue for everyone, plus each user's own.
CREATE POLICY "View public catalogue and own clips" ON public.animation_clips FOR SELECT TO public
  USING ((((owner_id IS NULL) AND is_active) OR (( SELECT auth.uid() AS uid) = owner_id)));
CREATE POLICY "Owners can add their clips" ON public.animation_clips FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));
CREATE POLICY "Owners can update their clips" ON public.animation_clips FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));
CREATE POLICY "Owners can delete their clips" ON public.animation_clips FOR DELETE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_id));

-- Rate limits: no client access at all (see grants below).
CREATE POLICY rate_limits_no_client_access ON public.rate_limits AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- ─── Grants that differ from Supabase's defaults ─────────────────────────────

REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limits TO service_role;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;

REVOKE ALL ON public.entity_appearances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.entity_appearances TO authenticated;

-- ─── Storage: user-uploaded GLB models, private per user folder ──────────────

INSERT INTO storage.buckets (id, name, public) VALUES ('models', 'models', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY models_read_own ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'models'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY models_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'models'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY models_delete ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'models'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- ─── Realtime: each user hears only their own agent-control channel ─────────

CREATE POLICY control_channel_receive ON realtime.messages FOR SELECT TO authenticated
  USING (((extension = 'broadcast'::text) AND (realtime.topic() = ('control:'::text || (( SELECT auth.uid() AS uid))::text))));

-- ─── Seed: catalogues the clients expect ─────────────────────────────────────

INSERT INTO public.rigs (id, label, bone_names, source_map) VALUES
  ('standard', 'VEA standard (22 bones)',
   ARRAY['Hips','Spine','Spine1','Spine2','Neck','Head',
         'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
         'RightShoulder','RightArm','RightForeArm','RightHand',
         'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
         'RightUpLeg','RightLeg','RightFoot','RightToeBase'],
   '{}'),
  -- Mixamo names are the standard ones behind 'mixamorig:', which GLTFLoader
  -- sanitises to 'mixamorig'. Both spellings map.
  ('mixamo', 'Mixamo',
   ARRAY['mixamorig:Hips','mixamorig:Spine','mixamorig:Spine1','mixamorig:Spine2',
         'mixamorig:Neck','mixamorig:Head',
         'mixamorig:LeftShoulder','mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:LeftHand',
         'mixamorig:RightShoulder','mixamorig:RightArm','mixamorig:RightForeArm','mixamorig:RightHand',
         'mixamorig:LeftUpLeg','mixamorig:LeftLeg','mixamorig:LeftFoot','mixamorig:LeftToeBase',
         'mixamorig:RightUpLeg','mixamorig:RightLeg','mixamorig:RightFoot','mixamorig:RightToeBase'],
   (SELECT jsonb_object_agg(prefix || b, b)
      FROM unnest(ARRAY['Hips','Spine','Spine1','Spine2','Neck','Head',
                        'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
                        'RightShoulder','RightArm','RightForeArm','RightHand',
                        'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
                        'RightUpLeg','RightLeg','RightFoot','RightToeBase']) AS b,
           unnest(ARRAY['mixamorig:', 'mixamorig']) AS prefix))
ON CONFLICT (id) DO NOTHING;

-- The first clip we own, generated in the client by buildIdleClip().
INSERT INTO public.animation_clips
  (name, tags, moods, generator, generator_params, duration_s, loops, source, license, verify_report)
VALUES
  ('idle_breathe', ARRAY['idle'], ARRAY['calm', 'listening'],
   'idle_breathe', '{"breathSeconds": 4, "amplitude": 1}', 8, true, 'procedural', 'owned',
   '{"ok": true, "issues": [], "bonesCovered": 22, "maxBoneStretch": 0.013, "verifier": "perzona/verifyClip v1"}')
ON CONFLICT DO NOTHING;

-- Ids derive from the mesh id, so re-running updates instead of duplicating.
INSERT INTO public.costumes (id, slot, label, mesh_id, color_slots, tags, rarity, sort_order)
VALUES
  (md5('vea:costume:outfit_dress')::uuid, 'outfit', 'Dress', 'outfit_dress',
   '[{"key":"fabric","label":"Fabric","default":"#b6486a"}]', ARRAY['basic', 'formal'], 'rare', 10),
  (md5('vea:costume:outfit_jumpsuit')::uuid, 'outfit', 'Jumpsuit', 'outfit_jumpsuit',
   '[{"key":"fabric","label":"Fabric","default":"#4b5563"}]', ARRAY['casual', 'work'], 'rare', 20),
  (md5('vea:costume:shirt_tee')::uuid, 'shirt', 'T-shirt', 'shirt_tee',
   '[{"key":"fabric","label":"Fabric","default":"#f2f4f7"}]', ARRAY['basic', 'casual', 'summer'], 'common', 10),
  (md5('vea:costume:shirt_long')::uuid, 'shirt', 'Long sleeve tee', 'shirt_long',
   '[{"key":"fabric","label":"Fabric","default":"#2f6f8f"}]', ARRAY['basic', 'casual'], 'common', 20),
  (md5('vea:costume:shirt_jacket')::uuid, 'shirt', 'Jacket', 'shirt_jacket',
   '[{"key":"fabric","label":"Fabric","default":"#3b3f46"},{"key":"collar","label":"Collar","default":"#22262b"}]', ARRAY['casual', 'winter'], 'rare', 30),
  (md5('vea:costume:pants_long')::uuid, 'pants', 'Trousers', 'pants_long',
   '[{"key":"fabric","label":"Fabric","default":"#3a4a6b"}]', ARRAY['basic', 'casual'], 'common', 10),
  (md5('vea:costume:pants_short')::uuid, 'pants', 'Shorts', 'pants_short',
   '[{"key":"fabric","label":"Fabric","default":"#7a8a5f"}]', ARRAY['casual', 'summer', 'sport'], 'common', 20),
  (md5('vea:costume:pants_skirt')::uuid, 'pants', 'Skirt', 'pants_skirt',
   '[{"key":"fabric","label":"Fabric","default":"#8f3f5a"}]', ARRAY['casual', 'summer'], 'common', 30),
  (md5('vea:costume:shoes_sneakers')::uuid, 'shoes', 'Sneakers', 'shoes_sneakers',
   '[{"key":"fabric","label":"Fabric","default":"#e8e8ea"},{"key":"sole","label":"Sole","default":"#2a2a2e"}]', ARRAY['basic', 'sport'], 'common', 10),
  (md5('vea:costume:shoes_boots')::uuid, 'shoes', 'Boots', 'shoes_boots',
   '[{"key":"leather","label":"Leather","default":"#5a3a26"},{"key":"sole","label":"Sole","default":"#241a14"}]', ARRAY['winter', 'work'], 'rare', 20),
  (md5('vea:costume:gloves_short')::uuid, 'gloves', 'Gloves', 'gloves_short',
   '[{"key":"fabric","label":"Fabric","default":"#2f3237"}]', ARRAY['winter'], 'common', 10),
  (md5('vea:costume:hat_cap')::uuid, 'hat', 'Cap', 'hat_cap',
   '[{"key":"fabric","label":"Fabric","default":"#c0392b"},{"key":"brim","label":"Brim","default":"#7d241a"}]', ARRAY['casual', 'sport'], 'common', 10),
  (md5('vea:costume:hat_beanie')::uuid, 'hat', 'Beanie', 'hat_beanie',
   '[{"key":"fabric","label":"Fabric","default":"#2c3e50"}]', ARRAY['winter'], 'common', 20),
  (md5('vea:costume:glasses_frames')::uuid, 'glasses', 'Glasses', 'glasses_frames',
   '[{"key":"frame","label":"Frame","default":"#22252a"},{"key":"lens","label":"Lens","default":"#cfe4f2"}]', ARRAY['basic'], 'common', 10),
  (md5('vea:costume:glasses_shades')::uuid, 'glasses', 'Sunglasses', 'glasses_shades',
   '[{"key":"frame","label":"Frame","default":"#111318"},{"key":"lens","label":"Lens","default":"#2b2f38"}]', ARRAY['summer'], 'rare', 20),
  (md5('vea:costume:earrings_studs')::uuid, 'earrings', 'Studs', 'earrings_studs',
   '[{"key":"metal","label":"Metal","default":"#e6c96a"}]', ARRAY['jewelry'], 'common', 10),
  (md5('vea:costume:earrings_hoops')::uuid, 'earrings', 'Hoops', 'earrings_hoops',
   '[{"key":"metal","label":"Metal","default":"#d9d9de"}]', ARRAY['jewelry'], 'rare', 20),
  (md5('vea:costume:rings_band')::uuid, 'rings', 'Ring', 'rings_band',
   '[{"key":"metal","label":"Metal","default":"#e6c96a"}]', ARRAY['jewelry'], 'rare', 10),
  (md5('vea:costume:wrist_watch')::uuid, 'wrist', 'Watch', 'wrist_watch',
   '[{"key":"strap","label":"Strap","default":"#2b2b30"},{"key":"dial","label":"Dial","default":"#dfe3e8"}]', ARRAY['jewelry', 'work'], 'epic', 10),
  (md5('vea:costume:wrist_band')::uuid, 'wrist', 'Wristband', 'wrist_band',
   '[{"key":"fabric","label":"Fabric","default":"#d94f70"}]', ARRAY['casual', 'sport'], 'common', 20),
  (md5('vea:costume:prop_ball')::uuid, 'prop', 'Ball', 'prop_ball',
   '[{"key":"color","label":"Color","default":"#e8763a"}]', ARRAY['sport'], 'common', 10),
  (md5('vea:costume:prop_mug')::uuid, 'prop', 'Mug', 'prop_mug',
   '[{"key":"color","label":"Color","default":"#f0f0f2"}]', ARRAY['casual'], 'rare', 20)
ON CONFLICT (id) DO NOTHING;
