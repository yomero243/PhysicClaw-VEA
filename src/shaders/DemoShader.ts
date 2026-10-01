import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { extend } from '@react-three/fiber'

/**
 * DemoShader — enhanced energy material for the public demo page.
 * Separate from EnergyShader so the production pipeline is untouched.
 *
 * Uniforms:
 *   uTime      — elapsed seconds (mutated each frame)
 *   uIntensity — 0.0–2.0, drives displacement and glow
 *   uColor     — vec3 lerped per mood
 */
const DemoShaderMaterial = shaderMaterial(
    {
        uTime: 0,
        uIntensity: 0.5,
        uColor: new THREE.Color(0.0, 1.0, 1.0),
    },

    // ── Vertex ───────────────────────────────────────────────────────────────
    `
    varying vec2  vUv;
    varying vec3  vNormal;
    uniform float uTime;
    uniform float uIntensity;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }

    void main() {
        vUv    = uv;
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;

        // Organic surface displacement driven by FBM + breathing pulse
        float n = noise(uv * 5.0 + uTime * 0.4);
        float breathe = sin(uTime * 1.8) * 0.04;
        pos += normal * (n * 0.07 + breathe) * uIntensity;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
    `,

    // ── Fragment ─────────────────────────────────────────────────────────────
    `
    varying vec2  vUv;
    varying vec3  vNormal;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3  uColor;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }
    // Fractional brownian motion — 5 octaves
    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p  = p * 2.1 + vec2(1.7, 9.2);
            a *= 0.5;
        }
        return v;
    }

    void main() {
        // ── Rim lighting ─────────────────────────────────────────────────────
        vec3  viewDir = vec3(0.0, 0.0, 1.0);
        float rim     = 1.0 - max(dot(vNormal, viewDir), 0.0);
        rim = pow(rim, 2.2);

        // ── FBM surface noise ─────────────────────────────────────────────────
        float n1 = fbm(vUv * 2.5 + uTime * 0.18);
        float n2 = fbm(vUv * 5.0 - uTime * 0.12 + n1 * 0.8);

        // ── Cyberpunk scanlines ───────────────────────────────────────────────
        float scan = sin(vUv.y * 120.0 + uTime * 3.0) * 0.03 + 0.97;

        // ── Energy burst spots ────────────────────────────────────────────────
        float burst = smoothstep(0.62, 1.0, n2);

        // ── Final color ───────────────────────────────────────────────────────
        vec3 col = uColor * (0.3 + n2 * 0.7);
        col += uColor * rim * uIntensity * 3.0;           // rim glow
        col += vec3(1.0) * burst * uIntensity * 0.6;      // bright energy sparks

        float alpha = (0.25 + rim * 0.6 + n2 * 0.15 * uIntensity) * scan;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    }
    `
)

extend({ DemoShaderMaterial })

declare module '@react-three/fiber' {
    interface ThreeElements {
        demoShaderMaterial: any // eslint-disable-line @typescript-eslint/no-explicit-any
    }
}

export { DemoShaderMaterial }
