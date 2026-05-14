import React, { useCallback } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { supabase } from '../lib/supabase'
import type { ObjectType } from '../types/database'

/**
 * CubeGenerator — Botón para crear un cubo y persistirlo en la BD,
 * y otro para borrar todos los cubos existentes.
 */
export const CubeGenerator: React.FC = () => {
  const { upsertObject, removeObject, sceneObjects, userId, currentScene } = useSceneStore()

  const createCube = useCallback(async () => {
    if (!userId || !currentScene) {
      console.warn('[CubeGenerator] No hay escena activa disponible.')
      return
    }

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

    console.log('[CubeGenerator] Generando cubo:', cubeData)
    await upsertObject(cubeData)
    
  }, [userId, currentScene, upsertObject])

  const deleteCubes = useCallback(async () => {
    if (!currentScene) {
      console.warn('[CubeGenerator] No se puede borrar: No hay escena activa.')
      return
    }

    // 1. Buscamos cubos en el estado local para tener una referencia
    const cubes = sceneObjects.filter(
      (obj) => (obj.metadata as any)?.shape === 'cube' || (obj.metadata as any)?.is_primitive
    )

    console.log(`[CubeGenerator] Intentando borrar ${cubes.length} cubos encontrados en estado local...`)

    if (cubes.length > 0) {
      // Borramos uno por uno usando la acción del hook para que la UI se actualice
      for (const cube of cubes) {
        await removeObject(cube.id)
      }
    } else {
      // 2. Si no hay nada en el estado local, intentamos un borrado directo por si acaso
      console.log('[CubeGenerator] No se hallaron cubos en el estado local. Intentando borrado directo en BD...')
      
      const { error } = await supabase
        .from('scene_objects')
        .delete()
        .eq('scene_id', currentScene.id)
        .or('metadata->>shape.eq.cube,metadata->>is_primitive.eq.true')

      if (error) {
        console.error('[CubeGenerator] Error en borrado directo:', error)
      } else {
        console.log('[CubeGenerator] Comando de borrado enviado a Supabase.')
      }
    }
  }, [currentScene, sceneObjects, removeObject])

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
    width: '160px'
  }

  return (
    <div style={{
      position: 'absolute',
      top: 80,
      right: 20,
      zIndex: 1000, // Aumentamos zIndex para asegurar que sea clickable
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
