import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MIN_CHANGE, placeChanged, readPlace } from '../useLastPlace'

describe('last place', () => {
    it('reads position and rotation rounded to the millimetre', () => {
        const o = new THREE.Object3D()
        o.position.set(1.23456, 0, -2.0004)
        o.rotation.set(0, Math.PI / 2, 0)
        expect(readPlace(o)).toEqual({ position: [1.235, 0, -2], rotation: [0, 1.571, 0] })
    })

    it('always saves the first place', () => {
        expect(placeChanged(null, [0, 0, 0])).toBe(true)
    })

    it('ignores jitter below the threshold and saves real moves', () => {
        expect(placeChanged([0, 0, 0], [MIN_CHANGE / 2, 0, 0])).toBe(false)
        expect(placeChanged([0, 0, 0], [0, 0, MIN_CHANGE * 5])).toBe(true)
    })
})
