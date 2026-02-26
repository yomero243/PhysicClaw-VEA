import { useEffect } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'

export const MyCharacter = () => {
    // Encoded URL to handle spaces and special characters safely
    const { scene, animations } = useGLTF('/Avata1.glb')
    const { actions } = useAnimations(animations, scene)

    useEffect(() => {
        // Log available animations to help debugging
        console.log('Available animations:', Object.keys(actions))

        // Play the first available animation
        const action = actions[Object.keys(actions)[0]]
        if (action) {
            action.reset().fadeIn(0.5).play()
        }
    }, [actions])

    return <primitive object={scene} scale={1} position={[0, -1, 0.5]} />
}


