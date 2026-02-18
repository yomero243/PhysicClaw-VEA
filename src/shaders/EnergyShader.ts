import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { extend } from '@react-three/fiber'

// Define the shader material
const EnergyShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uIntensity: 0.5,
    uColor: new THREE.Color(0.2, 0.6, 1.0)
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform float uTime;
    uniform float uIntensity;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;
      
      // Subtle breathing/pulsing effect
      float pulse = sin(uTime * 2.0) * 0.05 * uIntensity;
      pos += normal * pulse;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColor;

    void main() {
      // Dynamic pattern
      float noise = sin(vUv.x * 10.0 + uTime) * cos(vUv.y * 10.0 + uTime * 0.5);
      
      // Rim lighting approximation for energy effect
      vec3 viewDir = vec3(0.0, 0.0, 1.0); // Simplified view direction
      float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
      rim = pow(rim, 3.0);
      
      // Combine base color with intensity and pattern
      vec3 color = uColor + (vec3(rim) * uIntensity * 2.0);
      float alpha = 0.6 + (0.4 * noise * uIntensity) + (rim * 0.5);
      
      gl_FragColor = vec4(color, alpha);
    }
  `
)

// Register the material with R3F
extend({ EnergyShaderMaterial })

// Add type definition for TypeScript
declare module '@react-three/fiber' {
  interface ThreeElements {
    energyShaderMaterial: any // Using any to avoid version-specific type issues
  }
}

export { EnergyShaderMaterial }
