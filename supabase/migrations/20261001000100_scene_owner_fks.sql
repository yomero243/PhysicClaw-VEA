-- scenes and objects_3d had no foreign key to their owner, so deleting a
-- user left their scenes (and, through scenes, their objects) behind.
-- Cascade like every other owned table does.
ALTER TABLE public.scenes
  DROP CONSTRAINT IF EXISTS scenes_user_id_fkey,
  ADD CONSTRAINT scenes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.objects_3d
  DROP CONSTRAINT IF EXISTS objects_3d_user_id_fkey,
  ADD CONSTRAINT objects_3d_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
