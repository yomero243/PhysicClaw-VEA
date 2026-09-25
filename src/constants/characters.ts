import { type CharacterId, type RigType } from '../lib/constraints'

export interface CharacterConfig {
    id: CharacterId
    name: string
    modelUrl: string
    storagePath?: string
    type: 'fbx' | 'glb'
    scale: number
    position: [number, number, number]
    defaultAnimation?: string
    animations?: Partial<Record<string, string>>
    // Set for user-uploaded S3 models
    rigType?: RigType
}

/**
 * One agent, one entity. The built-in entity is the procedural aura
 * (AuraEntity); a user's uploaded models join it as custom characters.
 * The id stays 'base-sphere' because agents already address it by that
 * name through the control API.
 */
export const ENTITY_ID = 'base-sphere' as CharacterId

export const CHARACTERS: CharacterConfig[] = [
    {
        id: ENTITY_ID,
        name: 'Entity',
        modelUrl: '',
        type: 'glb',
        scale: 1,
        position: [0, 0, 0],
    },
]

export const REGISTERED_CHARACTER_IDS = CHARACTERS.map(c => c.id) as readonly CharacterId[]
