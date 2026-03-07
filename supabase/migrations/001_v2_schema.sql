-- PhysicClaw VEA v2.0 Schema

-- Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Scenes
CREATE TABLE scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Scene',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3D Objects
CREATE TABLE objects_3d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_url text,
  object_type text DEFAULT 'glb',
  position jsonb DEFAULT '{"x":0,"y":0,"z":0}',
  rotation jsonb DEFAULT '{"x":0,"y":0,"z":0}',
  scale jsonb DEFAULT '{"x":1,"y":1,"z":1}',
  shader_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES scenes(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_scenes_user_id ON scenes(user_id);
CREATE INDEX idx_objects_3d_scene_id ON objects_3d(scene_id);
CREATE INDEX idx_objects_3d_user_id ON objects_3d(user_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_scene_id ON messages(scene_id);
