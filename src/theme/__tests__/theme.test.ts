import { describe, expect, it } from 'vitest'
import { DAY_HOURS, PALETTES, modeForHour } from '../theme'

describe('modeForHour', () => {
    it('is day from the start hour up to, not including, the end hour', () => {
        expect(modeForHour(DAY_HOURS.start)).toBe('day')
        expect(modeForHour(12)).toBe('day')
        expect(modeForHour(DAY_HOURS.end - 1)).toBe('day')
    })

    it('is night otherwise, across midnight', () => {
        expect(modeForHour(DAY_HOURS.end)).toBe('night')
        expect(modeForHour(23)).toBe('night')
        expect(modeForHour(0)).toBe('night')
        expect(modeForHour(DAY_HOURS.start - 1)).toBe('night')
    })
})

describe('PALETTES', () => {
    it('defines the same tokens for day and night', () => {
        expect(Object.keys(PALETTES.night).sort()).toEqual(Object.keys(PALETTES.day).sort())
        expect(Object.keys(PALETTES.night.scene).sort()).toEqual(Object.keys(PALETTES.day.scene).sort())
    })

    it('uses #rrggbb colours and "r, g, b" triplets that CSS rgba(var(), a) accepts', () => {
        for (const palette of Object.values(PALETTES)) {
            for (const [key, value] of Object.entries(palette)) {
                if (typeof value !== 'string') continue
                if (key.endsWith('Rgb')) expect(value).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/)
                else expect(value).toMatch(/^#[0-9A-F]{6}$/)
            }
        }
    })
})
