import { ControlCommandSchema, type ControlCommand, toIntensity, toCharacterId } from './constraints'
import { useSoulStore } from '../store/soulStore'
import { useSceneStore } from '../store/sceneStore'
import { REGISTERED_CHARACTER_IDS } from '../constants/characters'
import type { ObjectType } from '../types/database'

export type { ControlCommand }

export function parseControlCommand(raw: unknown): ControlCommand | null {
    const result = ControlCommandSchema.safeParse(raw)
    return result.success ? result.data : null
}

function isPrimitiveObject(metadata: unknown): boolean {
    const m = metadata as Record<string, unknown> | null
    return m?.shape === 'cube' || m?.is_primitive === true
}

export function applyCommand(cmd: ControlCommand) {
    const store = useSoulStore.getState()
    switch (cmd.command) {
        case 'setMood':
            store.setMood(cmd.value)
            break
        case 'setIsThinking':
            store.setIsThinking(cmd.value)
            break
        case 'setIntensity':
            store.setIntensity(toIntensity(cmd.value))
            break
        case 'setLastMessage':
            store.setLastMessage(cmd.value)
            break
        case 'setActiveCharacterId': {
            const id = toCharacterId(cmd.value, REGISTERED_CHARACTER_IDS)
            if (id) store.setActiveCharacterId(id)
            break
        }
        case 'setShaderColor':
            store.setCharacterOverride(cmd.value.characterId, { shaderColor: cmd.value.color })
            break
        case 'setObjectVisibility':
            store.setObjectVisible(cmd.value.id, cmd.value.visible)
            break
        // Scene commands below only reach the client in dev mode (HMR path).
        // In production the control Edge Function writes scene_objects
        // directly and Realtime updates the UI.
        case 'spawnObject': {
            const scene = useSceneStore.getState()
            const v = cmd.value
            void scene.upsertObject({
                object_type: 'prop' as ObjectType,
                character_id: null,
                label: v.label ?? `AgentObject_${Date.now()}`,
                model_url: v.model_url ?? null,
                position: v.position ?? [0, 0, 0],
                rotation: v.rotation ?? [0, 0, 0],
                scale_v: v.scale ?? [1, 1, 1],
                metadata: v.model_url
                    ? { kind: 'gaussian_splat', format: 'splat', spawned_by: 'agent' }
                    : { shape: 'cube', is_primitive: true, color: v.color ?? '#8CFFB0', spawned_by: 'agent' },
                sort_order: 0,
                is_visible: true,
            })
            break
        }
        case 'removeObject': {
            const scene = useSceneStore.getState()
            if (cmd.value === 'primitives') {
                scene.sceneObjects
                    .filter(o => isPrimitiveObject(o.metadata))
                    .forEach(o => void scene.removeObject(o.id))
            } else {
                void scene.removeObject(cmd.value)
            }
            break
        }
    }
}
