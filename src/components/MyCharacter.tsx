
import { useEffect } from 'react'
import { useAnimations, useFBX } from '@react-three/drei'

export const MyCharacter = () => {
    // Encoded URL to handle spaces and special characters safely
    const fbx = useFBX('/Happy%20Idle%20(1).fbx')
    const { actions } = useAnimations(fbx.animations, fbx)

    useEffect(() => {
        // Log available animations to help debugging
        console.log('Available animations:', Object.keys(actions))

        // Play the first available animation
        const action = actions[Object.keys(actions)[0]]
        if (action) {
            action.reset().fadeIn(0.5).play()
        }
    }, [actions])

    return <primitive object={fbx} scale={0.01} position={[0, -1, 0.5]} />
}


