-- The client subscribes to postgres_changes on scene_objects (sceneObjectsApi
-- in src/lib/supabase.ts) so objects an agent spawns through the control
-- Edge Function appear live. No migration ever added the table to the
-- supabase_realtime publication, so those events never fired.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scene_objects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scene_objects;
  END IF;
END $$;

-- Left behind when perzona_avatars was folded into entities.
DROP FUNCTION IF EXISTS public.set_perzona_avatars_updated_at();
