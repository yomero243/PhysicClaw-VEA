// ============================================================
// PhysicClaw-VEA — Aura shaders
// The entity's body when it has no model: a small glowing core, a
// camera-facing halo, and a ring of rising motes.
//
// Budget, because this has to hold 60 fps on mid-range phones:
//   • every motion lives in the vertex/fragment shaders; the CPU only
//     writes a handful of uniforms per frame;
//   • the core is a ~640-vertex icosphere, the halo a single quad, the
//     motes one draw call of GL_POINTS;
//   • additive blending with depthWrite off, so there is no sorting and
//     nothing casts or receives shadows.
// ============================================================
import * as THREE from 'three'

export interface AuraUniforms {
    [uniform: string]: THREE.IUniform
    uTime: THREE.IUniform<number>
    uColor: THREE.IUniform<THREE.Color>
    /** 0 → ~3.3, same scale the old energy shader received. */
    uIntensity: THREE.IUniform<number>
    /** 0 at rest, 1 while the agent is thinking. Smoothed on the CPU. */
    uThinking: THREE.IUniform<number>
}

export function createAuraUniforms(color: THREE.ColorRepresentation): AuraUniforms {
    return {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: 0.5 },
        uThinking: { value: 0 },
    }
}

// Cheap value noise: one hash per lattice corner, no textures, no loops.
const NOISE_GLSL = /* glsl */ `
    float hash13(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.zyx + 31.32);
        return fract((p.x + p.y) * p.z);
    }

    float noise3(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
                mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
            mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
                mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
            f.z);
    }
`

const UNIFORMS_GLSL = /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uThinking;
`

// ─── Core: a bright heart with a fresnel rim ─────────────────────────────────

export function createCoreMaterial(uniforms: AuraUniforms): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
            ${UNIFORMS_GLSL}
            ${NOISE_GLSL}
            varying vec3 vNormalV;
            varying vec3 vViewDir;
            varying float vNoise;

            void main() {
                float speed = 0.5 + uThinking * 1.5;
                vNoise = noise3(position * 2.5 + vec3(0.0, uTime * speed, 0.0));
                // Breathes slowly at rest, churns while thinking.
                float swell = 0.04 + 0.03 * uIntensity + 0.05 * uThinking;
                vec3 pos = position * (1.0 + (vNoise - 0.5) * swell * 2.0);

                vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                vNormalV = normalize(normalMatrix * normal);
                vViewDir = normalize(-mv.xyz);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            ${UNIFORMS_GLSL}
            varying vec3 vNormalV;
            varying vec3 vViewDir;
            varying float vNoise;

            void main() {
                float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
                // A soft orb: white-hot where it faces you, dissolving into
                // the halo at the silhouette instead of ending on a hard edge.
                float heart = pow(facing, 2.5);
                vec3 col = mix(uColor, vec3(1.0), 0.75 * heart) * (0.8 + 0.4 * vNoise);
                float alpha = smoothstep(0.0, 0.85, facing) * (0.55 + 0.15 * uIntensity);
                gl_FragColor = vec4(col, alpha);
            }
        `,
    })
}

// ─── Halo: one billboarded quad, a soft flickering aura ─────────────────────

export function createHaloMaterial(uniforms: AuraUniforms): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
            varying vec2 vUv;

            void main() {
                vUv = uv;
                // Keep the object's position and scale, drop its rotation:
                // the quad always faces the camera.
                vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                float scale = length(modelMatrix[0].xyz);
                centre.xy += position.xy * scale;
                gl_Position = projectionMatrix * centre;
            }
        `,
        fragmentShader: /* glsl */ `
            ${UNIFORMS_GLSL}
            ${NOISE_GLSL}
            varying vec2 vUv;

            void main() {
                vec2 p = vUv * 2.0 - 1.0;
                float r = length(p);
                if (r > 1.0) discard;

                // Rotate the sample point, not the angle, so there is no seam.
                float a = uTime * (0.15 + 0.6 * uThinking);
                vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
                float n = noise3(vec3(q * 2.6, uTime * 0.35));

                // Flames lean upward: the upper half reaches further and its
                // noise scrolls up, so the aura rises off the core.
                vec2 f = vec2(p.x, p.y > 0.0 ? p.y * 0.72 : p.y * 1.15);
                float rf = length(f);
                float wisps = noise3(vec3(q * 3.2 - vec2(0.0, uTime * 0.6), uTime * 0.2));

                float reach = 0.34 + 0.08 * uIntensity - 0.08 * uThinking;
                float flame = smoothstep(reach + 0.3, reach - 0.1, rf + (wisps - 0.5) * 0.45 + (n - 0.5) * 0.2);
                float core = exp(-r * r * 22.0);
                float strength = flame * (0.16 + 0.1 * wisps) + core * 0.45;
                gl_FragColor = vec4(uColor * strength, 1.0);
            }
        `,
    })
}

// ─── Motes: GPU-animated points spiralling up around the core ───────────────

export function createMotesGeometry(count: number): THREE.BufferGeometry {
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
        seeds[i * 4] = Math.random() * Math.PI * 2 // start angle
        seeds[i * 4 + 1] = 0.45 + Math.random() * 0.75 // orbit radius
        seeds[i * 4 + 2] = Math.random() // speed / size
        seeds[i * 4 + 3] = Math.random() // life phase
    }

    const geometry = new THREE.BufferGeometry()
    // Positions are computed in the shader; this only sets the draw count.
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    // The real extent, so frustum culling works without per-frame bounds.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.6)
    return geometry
}

export function createMotesMaterial(uniforms: AuraUniforms, pixelRatio: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uPixelRatio: { value: pixelRatio } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
            ${UNIFORMS_GLSL}
            uniform float uPixelRatio;
            attribute vec4 aSeed;
            varying float vAlpha;

            void main() {
                float pace = 1.0 + uThinking * 1.5;
                float life = fract(aSeed.w + uTime * (0.07 + 0.08 * aSeed.z) * pace);
                float angle = aSeed.x + uTime * (0.25 + 0.45 * aSeed.z) * pace;
                // Thinking pulls the motes in close, like held breath.
                float radius = aSeed.y * mix(1.0, 0.55, uThinking) * (0.85 + 0.15 * sin(life * 6.2832));
                vec3 pos = vec3(cos(angle) * radius, (life - 0.35) * 1.5, sin(angle) * radius);

                vAlpha = sin(life * 3.14159) * (0.45 + 0.2 * uIntensity);

                vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = (14.0 + 18.0 * aSeed.z) * uPixelRatio / -mv.z;
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            ${UNIFORMS_GLSL}
            varying float vAlpha;

            void main() {
                float d = length(gl_PointCoord - 0.5);
                float soft = smoothstep(0.5, 0.0, d);
                gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35) * soft * vAlpha, 1.0);
            }
        `,
    })
}
