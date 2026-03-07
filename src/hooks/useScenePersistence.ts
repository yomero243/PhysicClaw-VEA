import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth'

export interface Scene {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Object3DRecord {
  id: string
  scene_id: string
  user_id: string
  model_url: string | null
  object_type: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  shader_config: Record<string, unknown>
  created_at: string
}

export function useScenePersistence() {
  const { user } = useAuth()
  const [scenes, setScenes] = useState<Scene[]>([])
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [objects, setObjects] = useState<Object3DRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setScenes([])
      setCurrentScene(null)
      setObjects([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data: sceneData, error: sceneErr } = await supabase
        .from('scenes')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })

      if (sceneErr) {
        if (!cancelled) { setError(sceneErr.message); setLoading(false) }
        return
      }

      if (!cancelled) setScenes(sceneData ?? [])

      const first = sceneData?.[0] ?? null
      if (!cancelled) setCurrentScene(first)

      if (first) {
        const { data: objData, error: objErr } = await supabase
          .from('objects_3d')
          .select('*')
          .eq('scene_id', first.id)

        if (objErr) {
          if (!cancelled) setError(objErr.message)
        } else if (!cancelled) {
          setObjects(objData ?? [])
        }
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [user])

  const saveScene = useCallback(async (name: string) => {
    if (!user) return
    const { data, error: err } = await supabase
      .from('scenes')
      .insert({ user_id: user.id, name })
      .select()
      .single()

    if (err) {
      setError(err.message)
    } else if (data) {
      setScenes((prev) => [...prev, data])
      setCurrentScene(data)
      setObjects([])
    }
  }, [user])

  const saveObject = useCallback(async (
    sceneId: string,
    data: Omit<Object3DRecord, 'id' | 'scene_id' | 'user_id' | 'created_at'>
  ) => {
    if (!user) return
    const { data: obj, error: err } = await supabase
      .from('objects_3d')
      .upsert({ scene_id: sceneId, user_id: user.id, ...data })
      .select()
      .single()

    if (err) {
      setError(err.message)
    } else if (obj) {
      setObjects((prev) => {
        const idx = prev.findIndex((o) => o.id === obj.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = obj
          return next
        }
        return [...prev, obj]
      })
    }
  }, [user])

  const deleteObject = useCallback(async (objectId: string) => {
    const { error: err } = await supabase
      .from('objects_3d')
      .delete()
      .eq('id', objectId)

    if (err) {
      setError(err.message)
    } else {
      setObjects((prev) => prev.filter((o) => o.id !== objectId))
    }
  }, [])

  return {
    scenes,
    currentScene,
    objects,
    saveScene,
    saveObject,
    deleteObject,
    loading,
    error,
  }
}
