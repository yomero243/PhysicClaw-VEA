-- 008_update_messages_schema.sql
-- Aligns the messages table with the TypeScript types and useSceneStore logic.

DO $$ BEGIN
    -- 1. Add session_id link (critical for session tracking)
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(id) ON DELETE CASCADE;

    -- 2. Add agent_id for multi-agent support
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS agent_id uuid;

    -- 3. Add snapshots for mood and intensity
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS mood_snapshot text;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS intensity_snapshot numeric;

    -- 4. Add audio_url for TTS support
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url text;

    -- 5. Update role check constraint
    -- First, drop the old constraint if it exists
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_role_check;
    
    -- Add the new constraint with expanded roles
    ALTER TABLE messages ADD CONSTRAINT messages_role_check 
        CHECK (role IN ('user', 'assistant', 'agent', 'system'));

END $$;

-- 6. Add index for performance on session queries
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
