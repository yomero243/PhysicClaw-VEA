import React, { useCallback } from 'react'
import { useScenePersistence } from '../hooks/useScenePersistence'
import type { ObjectType } from '../types/database'

/**
 * CubeGenerator — Botón para crear un cubo y persistirlo en la BD,
 * y otro para borrar todos los cubos existentes.
 */
export const CubeGenerator: React.FC = () => {
  const { upsertObject, removeObject, sceneObjects, userId, currentScene } = useScenePersistence()

  const createCube = useCallback(async () => {
    if (!userId || !currentScene) {
      console.warn('[CubeGenerator] No hay escena activa disponible.')
      return
    }

    // 1. Creamos el "array" (o estructura de datos) del cubo
    // Definimos una posición aleatoria para que no todos aparezcan en el mismo sitio
    const randomPos: [number, number, number] = [
      (Math.random() - 0.5) * 4,
      Math.random() * 2,
      (Math.random() - 0.5) * 4
    ]

    const cubeData = {
      object_type: 'prop' as ObjectType,
      character_id: null,
      label: `Cubo_${Date.now()}`,
      model_url: null,
      position: randomPos,
      rotation: [0, 0, 0] as [number, number, number],
      scale_v: [0.5, 0.5, 0.5] as [number, number, number],
      metadata: {
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        shape: 'cube',
        is_primitive: true
      },
      sort_order: 0,
      is_visible: true
    }

    console.log('Generando cubo:', cubeData)

    // 2. Guardamos en la Base de Datos
    await upsertObject(cubeData)
    
  }, [userId, currentScene, upsertObject])

  const deleteCubes = useCallback(async () => {
    const cubes = sceneObjects.filter(
      (obj) => (obj.metadata as any)?.shape === 'cube' || (obj.metadata as any)?.is_primitive
    )
    console.log(`Borrando ${cubes.length} cubos...`)
    for (const cube of cubes) {
      await removeObject(cube.id)
    }
  }, [sceneObjects, removeObject])

  const buttonStyle: React.CSSProperties = {
    padding: '10px 15px',
    background: 'rgba(0, 212, 255, 0.2)',
    border: '1px solid #00d4ff',
    borderRadius: '4px',
    color: '#00d4ff',
    fontFamily: '"Courier New", monospace',
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 0 10px rgba(0, 212, 255, 0.2)',
    transition: 'all 0.2s',
    width: '100%'
  }

  return (
    <div style={{
      position: 'absolute',
      top: 80,
      right: 20,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <button
        onClick={createCube}
        style={buttonStyle}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.4)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'}
      >
        + CREAR CUBO (BD)
      </button>
      
      <button
        onClick={deleteCubes}
        style={{
          ...buttonStyle,
          background: 'rgba(255, 50, 50, 0.2)',
          border: '1px solid #ff3232',
          color: '#ff3232',
          boxShadow: '0 0 10px rgba(255, 50, 50, 0.2)',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 50, 50, 0.4)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 50, 50, 0.2)'}
      >
        - BORRAR CUBOS
      </button>
    </div>
  )
}
