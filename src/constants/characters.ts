import { type CharacterId, type RigType } from '../lib/constraints'

export interface CharacterConfig {
    id: CharacterId
    name: string
    modelUrl: string
    type: 'fbx' | 'glb'
    scale: number
    position: [number, number, number]
    defaultAnimation?: string
    animations?: Partial<Record<string, string>>
    // Set for user-uploaded S3 models
    rigType?: RigType
}

export const CHARACTERS: CharacterConfig[] = [
    {
        id: 'happy-idle' as CharacterId,
        name: 'Happy Bot',
        modelUrl: '/Avata1.glb',
        type: 'glb',
        scale: 1,
        position: [0, -1, 0.5],
        defaultAnimation: 'mixamo.com',
    },
    {
        id: 'base-sphere' as CharacterId,
        name: 'Energy Core',
        modelUrl: '',
        type: 'glb',
        scale: 1,
        position: [0, 0, 0],
    },
]

export const REGISTERED_CHARACTER_IDS = CHARACTERS.map(c => c.id) as readonly CharacterId[]
