// src/components/RemoteAvatars.tsx
// R3F component — renders remote users' avatars inside an existing Canvas.
// MUST be placed inside a <Canvas> — never renders its own Canvas.

import { useRef, useEffect } from 'react'
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
 * GLTFAvatar — loaded from a URL via useGLTF.
 * useGLTF handles asset caching; we only dispose the clone on unmount.
 */
function GLTFAvatar({ url }: { url: string }) {
    const { scene } = useGLTF(url)
    const clonedScene = useRef<THREE.Group | null>(null)

    useEffect(() => {
        // Clone so multiple remote users with the same URL get independent transforms.
        clonedScene.current = scene.clone(true)
        return () => {
            // Dispose cloned geometries and materials to avoid GPU leaks.
            clonedScene.current?.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                    const mesh = obj as THREE.Mesh
                    mesh.geometry?.dispose()
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((m) => m.dispose())
                    } else {
                        mesh.material?.dispose()
                    }
                }
            })
            clonedScene.current = null
        }
    }, [scene])

    if (!clonedScene.current) return null
    return <primitive object={clonedScene.current} scale={1} />
}

/**
 * SphereAvatar — simple colored sphere used for 'base-sphere' avatarId.
 * Each instance gets a unique color derived from the userId.
 */
function SphereAvatar({ userId }: { userId: string }) {
    const geometryRef = useRef<THREE.SphereGeometry | null>(null)
    const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)

    // Deterministic color from userId (first 6 hex chars of a simple hash).
    const color = '#' + Array.from(userId.slice(0, 6))
        .map((c) => ((c.charCodeAt(0) * 37) % 256).toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 6)

    useEffect(() => {
        return () => {
            // Dispose geometry and material on unmount.
            geometryRef.current?.dispose()
            materialRef.current?.dispose()
        }
    }, [])

    return (
        <mesh>
            <sphereGeometry
                ref={geometryRef}
                args={[0.4, 16, 16]}
            />
            <meshStandardMaterial
                ref={materialRef}
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
    const geometryRef = useRef<THREE.BoxGeometry | null>(null)
    const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)

    useEffect(() => {
        return () => {
            geometryRef.current?.dispose()
            materialRef.current?.dispose()
        }
    }, [])

    return (
        <mesh>
            <boxGeometry ref={geometryRef} args={[0.5, 1, 0.3]} />
            <meshStandardMaterial ref={materialRef} color="#A78BFA" wireframe />
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
                color="#A78BFA"
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
