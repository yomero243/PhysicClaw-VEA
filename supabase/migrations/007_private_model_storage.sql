-- 007_private_model_storage.sql
-- Keeps uploaded GLB models private. Clients read their own files through
-- short-lived signed URLs instead of public object URLs.

UPDATE storage.buckets
SET public = false
WHERE id = 'models';

DROP POLICY IF EXISTS models_read ON storage.objects;
DROP POLICY IF EXISTS models_read_own ON storage.objects;

CREATE POLICY models_read_own ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'models'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
