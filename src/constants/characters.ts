export interface CharacterConfig {
    id: string;
    name: string;
    modelUrl: string;
    type: 'fbx' | 'glb';
    scale: number;
    position: [number, number, number];
    defaultAnimation?: string;
    animations?: Record<string, string>; // Mapping moods to animation names
}

export const CHARACTERS: CharacterConfig[] = [
    {
        id: 'happy-idle',
        name: 'Happy Bot',
        modelUrl: '/HappyIdle.fbx',
        type: 'fbx',
        scale: 0.01,
        position: [0, -1, 0.5],
        defaultAnimation: 'mixamo.com' // Usually FBX from Mixamo have this default name
    },
    {
        id: 'base-sphere',
        name: 'Energy Core',
        modelUrl: '', // Placeholder for base geometry
        type: 'glb',
        scale: 1,
        position: [0, 0, 0]
    }
];
