// src/components/RemoteAvatars.tsx
// R3F component — renders remote users' avatars inside an existing Canvas.
// MUST be placed inside a <Canvas> — never renders its own Canvas.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { isTrustedModelUrl } from '../multiplayer/validation'
import type { SessionUser } from '../types/multiplayer'

// ── RemoteAvatar ────────────────────────────────────────────────────────────

interface RemoteAvatarProps {
    user: SessionUser
}

/**
 * GLTFAvatar — loaded from a URL via useGLTF, which caches and owns the asset.
 * The clone shares geometries/materials with the cached asset, so it must NOT
 * dispose them — useGLTF.clear() is the only owner of that GPU memory.
 */
function GLTFAvatar({ url }: { url: string }) {
    const { scene } = useGLTF(url)
    // Clone so multiple remote users with the same URL get independent transforms.
    const clonedScene = useMemo(() => scene.clone(true), [scene])
    return <primitive object={clonedScene} scale={1} />
}

/**
 * SphereAvatar — simple colored sphere used for 'base-sphere' avatarId.
 * Each instance gets a unique color derived from the userId.
 * R3F auto-disposes JSX-declared geometries/materials on unmount.
 */
function SphereAvatar({ userId }: { userId: string }) {
    // Deterministic color from userId (first 6 hex chars of a simple hash).
    const color = '#' + Array.from(userId.slice(0, 6))
        .map((c) => ((c.charCodeAt(0) * 37) % 256).toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 6)

    return (
        <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.3}
            />
        </mesh>
    )
}

/**
 * PlaceholderAvatar — minimal box mesh used for 'happy-idle' or unknown avatarIds.
 */
function PlaceholderAvatar() {
    return (
        <mesh>
            <boxGeometry args={[0.5, 1, 0.3]} />
            <meshStandardMaterial color="#8CFFB0" wireframe />
        </mesh>
    )
}

/**
 * RemoteAvatar — a single remote user's avatar with position interpolation
 * and a floating userId label.
 */
function RemoteAvatar({ user }: RemoteAvatarProps) {
    const groupRef = useRef<THREE.Group>(null)

    // Store initial position and rotation to prevent React re-renders from resetting current values
    const initialPosition = useRef<[number, number, number]>(user.position)
    const initialRotation = useRef<[number, number, number]>(user.rotation)

    // Target position and rotation stored in refs — state updates inside useFrame are forbidden.
    const targetPositionRef = useRef<THREE.Vector3>(
        new THREE.Vector3(...user.position)
    )
    const targetRotationYRef = useRef<number>(user.rotation?.[1] ?? 0)

    // Keep target up-to-date when the user prop changes (React re-render path).
    targetPositionRef.current.set(...user.position)
    targetRotationYRef.current = user.rotation?.[1] ?? 0

    // Interpolate position and Y rotation each frame without touching React state.
    useFrame((_state, delta) => {
        if (!groupRef.current) return
        groupRef.current.position.lerp(targetPositionRef.current, 1 - Math.exp(-10 * delta))
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
            groupRef.current.rotation.y,
            targetRotationYRef.current,
            1 - Math.exp(-10 * delta)
        )
    })

    // Choose avatar mesh based on avatarId.
    const renderAvatar = () => {
        const { avatar_id } = user
        // avatar_id is announced by the remote client itself: only fetch GLBs
        // hosted on our own Supabase storage, never arbitrary external URLs.
        if (avatar_id?.startsWith('https://') && isTrustedModelUrl(avatar_id)) {
            return <GLTFAvatar url={avatar_id} />
        }
        if (avatar_id === 'base-sphere') {
            return <SphereAvatar userId={user.user_id} />
        }
        // 'happy-idle' or any other identifier → placeholder box.
        return <PlaceholderAvatar />
    }

    const labelText = user.user_id.slice(0, 6)

    return (
        <group 
            ref={groupRef} 
            position={initialPosition.current} 
            rotation={[0, initialRotation.current[1], 0]}
        >
            {renderAvatar()}
            {/* Floating label above the avatar — uses @react-three/drei Text */}
            <Text
                position={[0, 1.2, 0]}
                fontSize={0.18}
                color="#8CFFB0"
                anchorX="center"
                anchorY="middle"
                outlineColor="#000000"
                outlineWidth={0.02}
            >
                {labelText}
            </Text>
        </group>
    )
}

// ── RemoteAvatars (root export) ──────────────────────────────────────────────

interface RemoteAvatarsProps {
    remoteUsers: SessionUser[]
}

/**
 * RemoteAvatars — renders all remote users inside an existing R3F Canvas.
 * Place this component as a direct child of <Canvas> (or any R3F subtree).
 */
export function RemoteAvatars({ remoteUsers }: RemoteAvatarsProps) {
    if (remoteUsers.length === 0) return null

    return (
        <>
            {remoteUsers.map((user) => (
                <RemoteAvatar key={user.user_id} user={user} />
            ))}
        </>
    )
}
