import { useCallback, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { useSplatStore } from '../store/splatStore'
import type { ObjectType } from '../types/database'

const ENVIRONMENT_SPLAT_CDN_URL = 'https://huggingface.co/cakewalk/splat-data/resolve/main/room.splat'
const OBJECT_SPLAT_CDN_URL = 'https://huggingface.co/cakewalk/splat-data/resolve/main/nike.splat'
const GRID_FLOOR_Y = -1.01

const PANEL_STYLE: CSSProperties = {
    position: 'absolute',
    top: 84,
    right: 348,
    zIndex: 12,
    width: 260,
    padding: 12,
    background: 'linear-gradient(180deg, rgba(18,21,15,0.86), rgba(10,11,10,0.78))',
    border: '1px solid rgba(140,255,176,0.18)',
    borderRadius: 7,
    boxShadow: '0 18px 42px rgba(0,0,0,0.34), 0 0 18px rgba(140,255,176,0.06)',
    backdropFilter: 'blur(18px)',
    fontFamily: '"Courier New", monospace',
    color: '#EAF3DF',
}

const BUTTON_STYLE: CSSProperties = {
    height: 31,
    borderRadius: 4,
    border: '1px solid rgba(140,255,176,0.35)',
    background: 'rgba(140,255,176,0.10)',
    color: '#EAF3DF',
    fontFamily: '"Courier New", monospace',
    fontSize: 10,
    cursor: 'pointer',
}

const INPUT_STYLE: CSSProperties = {
    width: '100%',
    height: 34,
    boxSizing: 'border-box',
    padding: '0 10px',
    background: 'rgba(18,21,15,0.6)',
    border: '1px solid rgba(140,255,176,0.18)',
    borderRadius: 4,
    color: '#EAF3DF',
    fontFamily: '"Courier New", monospace',
    fontSize: 11,
    outline: 'none',
}

function normalizeSplatUrl(value: string): string {
    return value.trim()
}

function getInputOrDefaultUrl(value: string): string {
    return normalizeSplatUrl(value) || ENVIRONMENT_SPLAT_CDN_URL
}

export function GaussianSplatPanel() {
    const [url, setUrl] = useState(ENVIRONMENT_SPLAT_CDN_URL)
    const [status, setStatus] = useState<string | null>(null)
    const userId = useSceneStore((s) => s.userId)
    const currentScene = useSceneStore((s) => s.currentScene)
    const sceneObjects = useSceneStore((s) => s.sceneObjects)
    const upsertObject = useSceneStore((s) => s.upsertObject)
    const removeObject = useSceneStore((s) => s.removeObject)
    const addLocalSplat = useSplatStore((s) => s.addLocalSplat)
    const setLocalEnvironment = useSplatStore((s) => s.setLocalEnvironment)
    const nudgeLocalEnvironmentY = useSplatStore((s) => s.nudgeLocalEnvironmentY)
    const localSplats = useSplatStore((s) => s.localSplats)
    const removeLocalSplat = useSplatStore((s) => s.removeLocalSplat)
    const clearLocalSplats = useSplatStore((s) => s.clearLocalSplats)
    const localEnvironment = localSplats.find((splat) => splat.kind === 'environment') ?? null

    const sceneSplats = sceneObjects.filter((obj) => {
        const metadata = obj.metadata as Record<string, unknown>
        return (
            metadata?.kind === 'gaussian_splat' ||
            metadata?.kind === 'gaussian_splat_environment' ||
            obj.model_url?.toLowerCase().includes('.splat')
        )
    })

    const previewSplat = useCallback(() => {
        const src = getInputOrDefaultUrl(url)
        setLocalEnvironment(src)
        setStatus('ENVIRONMENT LOADING')
        setUrl(ENVIRONMENT_SPLAT_CDN_URL)
    }, [setLocalEnvironment, url])

    const saveSplat = useCallback(async () => {
        const src = getInputOrDefaultUrl(url)
        if (!currentScene || !userId) {
            setStatus('NO DB SESSION')
            return
        }

        await upsertObject({
            object_type: 'prop' as ObjectType,
            character_id: null,
            label: `EnvironmentSplat_${Date.now()}`,
            model_url: src,
            position: localEnvironment?.position ?? [0, GRID_FLOOR_Y, 0],
            rotation: localEnvironment?.rotation ?? [0, 0, 0],
            scale_v: localEnvironment?.scale ?? [1.8, 1.8, 1.8],
            metadata: {
                kind: 'gaussian_splat_environment',
                format: 'splat',
            },
            sort_order: 0,
            is_visible: true,
        })
        setStatus('ENVIRONMENT SAVED')
        setUrl(ENVIRONMENT_SPLAT_CDN_URL)
    }, [currentScene, localEnvironment, upsertObject, url, userId])

    const loadEnvironmentCdn = useCallback(() => {
        setLocalEnvironment(ENVIRONMENT_SPLAT_CDN_URL)
        setUrl(ENVIRONMENT_SPLAT_CDN_URL)
        setStatus('ROOM ENV LOADING')
    }, [setLocalEnvironment])

    const loadObjectCdn = useCallback(() => {
        addLocalSplat(OBJECT_SPLAT_CDN_URL, {
            kind: 'object',
            label: 'Nike sample',
            position: [0, -0.9, -1.5],
            scale: [1, 1, 1],
        })
        setUrl(OBJECT_SPLAT_CDN_URL)
        setStatus('OBJECT SAMPLE LOADING')
    }, [addLocalSplat])

    const deleteSceneSplats = useCallback(async () => {
        for (const splat of sceneSplats) {
            await removeObject(splat.id)
        }
        setStatus('SCENE SPLATS REMOVED')
    }, [removeObject, sceneSplats])

    return (
        <div style={PANEL_STYLE}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
            }}>
                <span style={{ fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>GS ENV</span>
                <span style={{ fontSize: 10, color: 'rgba(139,232,255,0.72)' }}>
                    {localSplats.length + sceneSplats.length}
                </span>
            </div>

            <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="ENVIRONMENT .SPLAT URL..."
                style={INPUT_STYLE}
            />

            <button
                onClick={loadEnvironmentCdn}
                style={{ ...BUTTON_STYLE, width: '100%', marginTop: 8 }}
            >
                LOAD ROOM ENV
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <button
                    onClick={() => nudgeLocalEnvironmentY(-0.05)}
                    disabled={!localEnvironment}
                    style={{ ...BUTTON_STYLE, opacity: localEnvironment ? 1 : 0.45 }}
                >
                    FLOOR DOWN
                </button>
                <button
                    onClick={() => nudgeLocalEnvironmentY(0.05)}
                    disabled={!localEnvironment}
                    style={{ ...BUTTON_STYLE, opacity: localEnvironment ? 1 : 0.45 }}
                >
                    FLOOR UP
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <button onClick={loadObjectCdn} style={BUTTON_STYLE}>
                    OBJECT SAMPLE
                </button>
                <button onClick={previewSplat} style={BUTTON_STYLE}>
                    USE URL ENV
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <button
                    onClick={saveSplat}
                    style={{
                        ...BUTTON_STYLE,
                        opacity: currentScene && userId ? 1 : 0.55,
                    }}
                >
                    SAVE ENV DB
                </button>
                <button
                    onClick={clearLocalSplats}
                    disabled={localSplats.length === 0}
                    style={{
                        ...BUTTON_STYLE,
                        opacity: localSplats.length > 0 ? 1 : 0.45,
                    }}
                >
                    CLEAR
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 8 }}>
                <button
                    onClick={deleteSceneSplats}
                    disabled={sceneSplats.length === 0}
                    style={{ ...BUTTON_STYLE, opacity: sceneSplats.length > 0 ? 1 : 0.45 }}
                >
                    CLEAR DB ENV
                </button>
            </div>

            {localSplats.length > 0 ? (
                <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 92, overflowY: 'auto' }}>
                    {localSplats.map((splat) => (
                        <button
                            key={splat.id}
                            onClick={() => removeLocalSplat(splat.id)}
                            style={{
                                padding: '6px 8px',
                                textAlign: 'left',
                                borderRadius: 4,
                                border: '1px solid rgba(140,255,176,0.16)',
                                background: 'rgba(255,255,255,0.035)',
                                color: 'rgba(216,247,255,0.78)',
                                fontFamily: '"Courier New", monospace',
                                fontSize: 10,
                                cursor: 'pointer',
                            }}
                        >
                            {splat.kind.toUpperCase()} #{splat.id.slice(0, 6)}
                        </button>
                    ))}
                </div>
            ) : null}

            {status ? (
                <div style={{
                    marginTop: 9,
                    fontSize: 9,
                    letterSpacing: 1,
                    color: 'rgba(139,232,255,0.64)',
                }}>
                    {status}
                    {localEnvironment ? ` :: Y ${localEnvironment.position[1].toFixed(2)}` : ''}
                </div>
            ) : null}
        </div>
    )
}
