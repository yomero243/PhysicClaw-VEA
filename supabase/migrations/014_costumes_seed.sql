-- Moved from VEA-perZona/supabase/migrations/002_costumes_seed.sql so this repository owns
-- the whole schema of the shared project (both repos numbered from 001, so
-- `supabase db push` from each would collide). Idempotent: safe to run even
-- if the original was already applied by hand.

-- VEA-perzona — Costume catalogue seed
--
-- Emitted from VEA-perZona/src/avatar/costume/localCatalog.ts, whose colour slots come
-- straight off COSTUME_MESHES — so every mesh_id here is one the client can
-- build and every colour slot matches a real material slot on the geometry.
--
-- Ids are derived from the mesh id instead of being random, which makes this
-- file re-runnable: applying it twice updates the rows rather than doubling
-- the wardrobe.

INSERT INTO costumes (id, slot, label, mesh_id, color_slots, tags, rarity, sort_order)
VALUES
  (md5('vea:costume:outfit_dress')::uuid, 'outfit', 'Dress', 'outfit_dress',
   '[{"key":"fabric","label":"Fabric","default":"#b6486a"}]'::jsonb, ARRAY['basic', 'formal'], 'rare', 10),
  (md5('vea:costume:outfit_jumpsuit')::uuid, 'outfit', 'Jumpsuit', 'outfit_jumpsuit',
   '[{"key":"fabric","label":"Fabric","default":"#4b5563"}]'::jsonb, ARRAY['casual', 'work'], 'rare', 20),
  (md5('vea:costume:shirt_tee')::uuid, 'shirt', 'T-shirt', 'shirt_tee',
   '[{"key":"fabric","label":"Fabric","default":"#f2f4f7"}]'::jsonb, ARRAY['basic', 'casual', 'summer'], 'common', 10),
  (md5('vea:costume:shirt_long')::uuid, 'shirt', 'Long sleeve tee', 'shirt_long',
   '[{"key":"fabric","label":"Fabric","default":"#2f6f8f"}]'::jsonb, ARRAY['basic', 'casual'], 'common', 20),
  (md5('vea:costume:shirt_jacket')::uuid, 'shirt', 'Jacket', 'shirt_jacket',
   '[{"key":"fabric","label":"Fabric","default":"#3b3f46"},{"key":"collar","label":"Collar","default":"#22262b"}]'::jsonb, ARRAY['casual', 'winter'], 'rare', 30),
  (md5('vea:costume:pants_long')::uuid, 'pants', 'Trousers', 'pants_long',
   '[{"key":"fabric","label":"Fabric","default":"#3a4a6b"}]'::jsonb, ARRAY['basic', 'casual'], 'common', 10),
  (md5('vea:costume:pants_short')::uuid, 'pants', 'Shorts', 'pants_short',
   '[{"key":"fabric","label":"Fabric","default":"#7a8a5f"}]'::jsonb, ARRAY['casual', 'summer', 'sport'], 'common', 20),
  (md5('vea:costume:pants_skirt')::uuid, 'pants', 'Skirt', 'pants_skirt',
   '[{"key":"fabric","label":"Fabric","default":"#8f3f5a"}]'::jsonb, ARRAY['casual', 'summer'], 'common', 30),
  (md5('vea:costume:shoes_sneakers')::uuid, 'shoes', 'Sneakers', 'shoes_sneakers',
   '[{"key":"fabric","label":"Fabric","default":"#e8e8ea"},{"key":"sole","label":"Sole","default":"#2a2a2e"}]'::jsonb, ARRAY['basic', 'sport'], 'common', 10),
  (md5('vea:costume:shoes_boots')::uuid, 'shoes', 'Boots', 'shoes_boots',
   '[{"key":"leather","label":"Leather","default":"#5a3a26"},{"key":"sole","label":"Sole","default":"#241a14"}]'::jsonb, ARRAY['winter', 'work'], 'rare', 20),
  (md5('vea:costume:gloves_short')::uuid, 'gloves', 'Gloves', 'gloves_short',
   '[{"key":"fabric","label":"Fabric","default":"#2f3237"}]'::jsonb, ARRAY['winter'], 'common', 10),
  (md5('vea:costume:hat_cap')::uuid, 'hat', 'Cap', 'hat_cap',
   '[{"key":"fabric","label":"Fabric","default":"#c0392b"},{"key":"brim","label":"Brim","default":"#7d241a"}]'::jsonb, ARRAY['casual', 'sport'], 'common', 10),
  (md5('vea:costume:hat_beanie')::uuid, 'hat', 'Beanie', 'hat_beanie',
   '[{"key":"fabric","label":"Fabric","default":"#2c3e50"}]'::jsonb, ARRAY['winter'], 'common', 20),
  (md5('vea:costume:glasses_frames')::uuid, 'glasses', 'Glasses', 'glasses_frames',
   '[{"key":"frame","label":"Frame","default":"#22252a"},{"key":"lens","label":"Lens","default":"#cfe4f2"}]'::jsonb, ARRAY['basic'], 'common', 10),
  (md5('vea:costume:glasses_shades')::uuid, 'glasses', 'Sunglasses', 'glasses_shades',
   '[{"key":"frame","label":"Frame","default":"#111318"},{"key":"lens","label":"Lens","default":"#2b2f38"}]'::jsonb, ARRAY['summer'], 'rare', 20),
  (md5('vea:costume:earrings_studs')::uuid, 'earrings', 'Studs', 'earrings_studs',
   '[{"key":"metal","label":"Metal","default":"#e6c96a"}]'::jsonb, ARRAY['jewelry'], 'common', 10),
  (md5('vea:costume:earrings_hoops')::uuid, 'earrings', 'Hoops', 'earrings_hoops',
   '[{"key":"metal","label":"Metal","default":"#d9d9de"}]'::jsonb, ARRAY['jewelry'], 'rare', 20),
  (md5('vea:costume:rings_band')::uuid, 'rings', 'Ring', 'rings_band',
   '[{"key":"metal","label":"Metal","default":"#e6c96a"}]'::jsonb, ARRAY['jewelry'], 'rare', 10),
  (md5('vea:costume:wrist_watch')::uuid, 'wrist', 'Watch', 'wrist_watch',
   '[{"key":"strap","label":"Strap","default":"#2b2b30"},{"key":"dial","label":"Dial","default":"#dfe3e8"}]'::jsonb, ARRAY['jewelry', 'work'], 'epic', 10),
  (md5('vea:costume:wrist_band')::uuid, 'wrist', 'Wristband', 'wrist_band',
   '[{"key":"fabric","label":"Fabric","default":"#d94f70"}]'::jsonb, ARRAY['casual', 'sport'], 'common', 20),
  (md5('vea:costume:prop_ball')::uuid, 'prop', 'Ball', 'prop_ball',
   '[{"key":"color","label":"Color","default":"#e8763a"}]'::jsonb, ARRAY['sport'], 'common', 10),
  (md5('vea:costume:prop_mug')::uuid, 'prop', 'Mug', 'prop_mug',
   '[{"key":"color","label":"Color","default":"#f0f0f2"}]'::jsonb, ARRAY['casual'], 'rare', 20)
ON CONFLICT (id) DO UPDATE SET
  slot        = EXCLUDED.slot,
  label       = EXCLUDED.label,
  mesh_id     = EXCLUDED.mesh_id,
  color_slots = EXCLUDED.color_slots,
  tags        = EXCLUDED.tags,
  rarity      = EXCLUDED.rarity,
  sort_order  = EXCLUDED.sort_order,
  is_active   = true,
  updated_at  = now();
