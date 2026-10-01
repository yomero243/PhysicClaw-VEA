// ============================================================
// PhysicClaw-VEA — useGLBUpload
// Handles uploading a GLB file to Supabase Storage bucket 'models'.
// Storage calls are allowed directly in hooks (per CLAUDE.md rules).
// ============================================================
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MODEL_UPLOAD } from '../lib/constraints'

export interface UseGLBUploadReturn {
    uploadGLB: (file: File, userId: string) => Promise<string>
    progress: number
    error: string | null
    isUploading: boolean
    reset: () => void
}

export function useGLBUpload(): UseGLBUploadReturn {
    const [progress, setProgress] = useState<number>(0)
    const [error, setError] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState<boolean>(false)

    const reset = useCallback(() => {
        setProgress(0)
        setError(null)
        setIsUploading(false)
    }, [])

    const uploadGLB = useCallback(async (file: File, userId: string): Promise<string> => {
        setError(null)
        setIsUploading(true)
        setProgress(0)

        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 96)
            const filePath = `${userId}/${crypto.randomUUID()}_${safeName || 'model.glb'}`

            // Supabase Storage JS SDK v2 does not expose upload-progress callbacks;
            // we simulate 50% before the request and 100% on completion.
            setProgress(10)

            const { error: uploadErr } = await supabase.storage
                .from('models')
                .upload(filePath, file, {
                    contentType: 'model/gltf-binary',
                    upsert: false,
                })

            if (uploadErr) {
                throw new Error(uploadErr.message)
            }

            setProgress(90)

            const { data: urlData, error: signedUrlErr } = await supabase.storage
                .from('models')
                .createSignedUrl(filePath, MODEL_UPLOAD.SIGNED_URL_SECONDS)

            if (signedUrlErr || !urlData?.signedUrl) {
                throw new Error(signedUrlErr?.message ?? 'Could not create signed model URL')
            }

            setProgress(100)
            return urlData.signedUrl
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Upload failed'
            setError(msg)
            throw Object.assign(new Error(msg), { cause: err })
        } finally {
            setIsUploading(false)
        }
    }, [])

    return { uploadGLB, progress, error, isUploading, reset }
}
