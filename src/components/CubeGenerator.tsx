import React, { useCallback } from 'react'
import { useScenePersistence } from '../hooks/useScenePersistence'
import type { ObjectType } from '../types/database'

/**
 * CubeGenerator — Botón para crear un cubo y persistirlo en la BD.
 */
export const CubeGenerator: React.FC = () => {
  const { upsertObject, userId, currentScene } = useScenePersistence()

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
      label: `Cubo_${Date.now()}`,
      model_url: null,
      position: randomPos,
      rotation: [0, 0, 0] as [number, number, number],
      scale: [0.5, 0.5, 0.5] as [number, number, number], // Usamos 'scale' para compatibilidad total
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

  return (
    <button
      onClick={createCube}
      style={{
        position: 'absolute',
        top: 80,
        right: 20,
        zIndex: 100,
        padding: '10px 15px',
        background: 'rgba(0, 212, 255, 0.2)',
        border: '1px solid #00d4ff',
        borderRadius: '4px',
        color: '#00d4ff',
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        cursor: 'pointer',
        boxShadow: '0 0 10px rgba(0, 212, 255, 0.2)',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.4)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'}
    >
      + CREAR CUBO (BD)
    </button>
  )
}
