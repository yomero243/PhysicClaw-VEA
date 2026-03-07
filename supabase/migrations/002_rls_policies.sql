-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects_3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Scenes: full CRUD for own rows
CREATE POLICY "Users can view own scenes"
  ON scenes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scenes"
  ON scenes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenes"
  ON scenes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenes"
  ON scenes FOR DELETE
  USING (auth.uid() = user_id);

-- Objects 3D: full CRUD for own rows
CREATE POLICY "Users can view own objects"
  ON objects_3d FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own objects"
  ON objects_3d FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own objects"
  ON objects_3d FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own objects"
  ON objects_3d FOR DELETE
  USING (auth.uid() = user_id);

-- Messages: full CRUD for own rows
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
