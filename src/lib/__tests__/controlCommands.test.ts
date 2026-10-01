import { describe, it, expect } from 'vitest'
import { ControlCommandSchema } from '../constraints'

const parse = (raw: unknown) => ControlCommandSchema.safeParse(raw)

describe('ControlCommandSchema — state commands', () => {
    it('accepts valid setMood', () => {
        expect(parse({ command: 'setMood', value: 'excited', id: '1' }).success).toBe(true)
    })

    it('rejects unknown mood', () => {
        expect(parse({ command: 'setMood', value: 'furious' }).success).toBe(false)
    })

    it('accepts setShaderColor with hex color', () => {
        expect(parse({
            command: 'setShaderColor',
            value: { characterId: 'base-sphere', color: '#ff44aa' },
        }).success).toBe(true)
    })

    it('rejects setShaderColor with non-hex color', () => {
        expect(parse({
            command: 'setShaderColor',
            value: { characterId: 'base-sphere', color: 'red' },
        }).success).toBe(false)
    })

    it('accepts setObjectVisibility', () => {
        expect(parse({
            command: 'setObjectVisibility',
            value: { id: 'happy-idle', visible: false },
        }).success).toBe(true)
    })

    it('rejects setObjectVisibility with non-boolean visible', () => {
        expect(parse({
            command: 'setObjectVisibility',
            value: { id: 'happy-idle', visible: 'no' },
        }).success).toBe(false)
    })
})

describe('ControlCommandSchema — scene commands', () => {
    it('accepts spawnObject with empty value (all defaults)', () => {
        expect(parse({ command: 'spawnObject', value: {} }).success).toBe(true)
    })

    it('accepts spawnObject with full cube config', () => {
        expect(parse({
            command: 'spawnObject',
            value: {
                label: 'Agent cube',
                color: '#ff4444',
                position: [1, 0.5, 0],
                rotation: [0, Math.PI, 0],
                scale: [0.5, 0.5, 0.5],
            },
        }).success).toBe(true)
    })

    it('rejects spawnObject position outside bounds', () => {
        expect(parse({
            command: 'spawnObject',
            value: { position: [999, 0, 0] },
        }).success).toBe(false)
    })

    it('rejects spawnObject scale of zero', () => {
        expect(parse({
            command: 'spawnObject',
            value: { scale: [0, 1, 1] },
        }).success).toBe(false)
    })

    it('accepts spawnObject with https .splat model_url', () => {
        expect(parse({
            command: 'spawnObject',
            value: { model_url: 'https://example.com/room.splat' },
        }).success).toBe(true)
    })

    it('rejects spawnObject with non-splat model_url', () => {
        expect(parse({
            command: 'spawnObject',
            value: { model_url: 'https://example.com/model.glb' },
        }).success).toBe(false)
    })

    it('rejects spawnObject with http (non-https) model_url', () => {
        expect(parse({
            command: 'spawnObject',
            value: { model_url: 'http://example.com/room.splat' },
        }).success).toBe(false)
    })

    it('accepts removeObject with a uuid', () => {
        expect(parse({
            command: 'removeObject',
            value: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
        }).success).toBe(true)
    })

    it("accepts removeObject with 'primitives'", () => {
        expect(parse({ command: 'removeObject', value: 'primitives' }).success).toBe(true)
    })

    it('rejects removeObject with arbitrary string', () => {
        expect(parse({ command: 'removeObject', value: 'all' }).success).toBe(false)
    })
})
