-- Moved from VEA-perZona/supabase/migrations/001_costumes.sql so this repository owns
-- the whole schema of the shared project (both repos numbered from 001, so
-- `supabase db push` from each would collide). Idempotent: safe to run even
-- if the original was already applied by hand.

-- VEA-perzona — Costume catalogue
--
-- The wardrobe the avatar editor reads. Rows are presets: a mesh id the
-- client knows how to build, plus labels, tints and merchandising metadata.
-- No geometry is ever stored here.
--
-- Read-only from the client. Rows are authored through the service role;
-- `author_id` is already in place for the user-uploaded phase, but no write
-- policy is granted yet, on purpose.

CREATE TABLE IF NOT EXISTS costumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL CHECK (slot IN (
    'outfit', 'shirt', 'pants', 'shoes', 'gloves',
    'hat', 'glasses', 'earrings', 'rings', 'wrist', 'prop'
  )),
  label text,
  mesh_id text NOT NULL,
  -- Ordered list of tintable slots, matching the mesh's material slots:
  -- [{"key":"tela","label":"Tela","default":"#f2f4f7"}, ...]
  -- An array rather than an object because the order is load-bearing: index
  -- i is what the avatar blob's colour overrides address.
  color_slots jsonb NOT NULL DEFAULT '[]',
  tags text[] NOT NULL DEFAULT '{}',
  rarity text CHECK (rarity IS NULL OR rarity IN ('common', 'rare', 'epic', 'legendary')),
  sort_order int NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_costumes_slot ON costumes(slot);
CREATE INDEX IF NOT EXISTS idx_costumes_is_active ON costumes(is_active);
-- The only query the editor actually makes: one slot's active rows, in order.
CREATE INDEX IF NOT EXISTS idx_costumes_slot_active_order ON costumes(slot, sort_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_costumes_tags ON costumes USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_costumes_author_id ON costumes(author_id);

-- Keep updated_at honest
CREATE OR REPLACE FUNCTION set_costumes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS costumes_set_updated_at ON costumes;
CREATE TRIGGER costumes_set_updated_at
  BEFORE UPDATE ON costumes
  FOR EACH ROW EXECUTE PROCEDURE set_costumes_updated_at();

-- RLS: public read of active rows, no client writes at all.
ALTER TABLE costumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active costumes" ON costumes;
CREATE POLICY "Anyone can view active costumes"
  ON costumes FOR SELECT
  USING (is_active = true);

-- Deliberately no INSERT / UPDATE / DELETE policy. With RLS enabled and no
-- write policy, anon and authenticated are denied every write; service_role
-- bypasses RLS and remains the only way to publish a garment.
