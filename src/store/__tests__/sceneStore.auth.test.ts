import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../lib/supabase'
import { useSceneStore } from '../sceneStore'

describe('sceneStore session handling', () => {
    const loadDefaultScene = vi.fn(async () => {})

    beforeEach(() => {
        useSceneStore.getState().reset()
        loadDefaultScene.mockClear()
        useSceneStore.setState({ loadDefaultScene })
    })

    it('uses the signed-in user and never mints an anonymous one', async () => {
        const anon = vi.spyOn(supabase.auth, 'signInAnonymously')
        await useSceneStore.getState().initialize('user-a')

        expect(anon).not.toHaveBeenCalled()
        expect(useSceneStore.getState().userId).toBe('user-a')
        expect(useSceneStore.getState().isAuthenticated).toBe(true)
        expect(loadDefaultScene).toHaveBeenCalledOnce()
    })

    it('does not reload the world for the same user', async () => {
        await useSceneStore.getState().initialize('user-a')
        await useSceneStore.getState().initialize('user-a')
        expect(loadDefaultScene).toHaveBeenCalledOnce()
    })

    it("drops the previous user's world when the account changes", async () => {
        await useSceneStore.getState().initialize('user-a')
        useSceneStore.setState({ sceneObjects: [{ id: 'belongs-to-a' } as never], loadDefaultScene })

        await useSceneStore.getState().initialize('user-b')

        expect(useSceneStore.getState().userId).toBe('user-b')
        expect(useSceneStore.getState().sceneObjects).toEqual([])
    })
})
