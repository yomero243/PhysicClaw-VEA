import { describe, it, expect } from 'vitest'
import { generateTokenSecret, sha256Hex } from '../agentTokens'

describe('generateTokenSecret', () => {
    it('produces pcvea_ + 64 hex chars', () => {
        const secret = generateTokenSecret()
        expect(secret).toMatch(/^pcvea_[0-9a-f]{64}$/)
    })

    it('produces unique values', () => {
        expect(generateTokenSecret()).not.toEqual(generateTokenSecret())
    })
})

describe('sha256Hex', () => {
    it('matches the known SHA-256 vector for "abc"', async () => {
        expect(await sha256Hex('abc')).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        )
    })

    it('returns 64 lowercase hex chars', async () => {
        const hash = await sha256Hex(generateTokenSecret())
        expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })
})
