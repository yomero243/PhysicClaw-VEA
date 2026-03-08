// ============================================================
// PhysicClaw-VEA v2.0 — AvatarPanel Component
// src/components/AvatarPanel.tsx
//
// Panel de personalización del avatar + configuración de escena.
// Lee/escribe usando useScenePersistence → Supabase.
// ============================================================
import { useState, useEffect } from 'react'
import { useScenePersistence } from '../hooks/useScenePersistence'
import { CHARACTERS } from '../constants/characters'
import { useSoulStore } from '../store/soulStore'

// ---- Sub-types para el formulario de color ----
interface ColorConfig {
    primary: string
    secondary: string
    glow: string
    emission: string
}

interface ShaderConfig {
    wireframeOpacity: number
    glowIntensity: number
    pulseSpeed: number
    distortion: number
    [key: string]: unknown
}

const DEFAULT_COLORS: ColorConfig = {
    primary: '#00ccff',
    secondary: '#7700ff',
    glow: '#00ffcc',
    emission: '#ffffff',
}

const DEFAULT_SHADERS: ShaderConfig = {
    wireframeOpacity: 0.3,
    glowIntensity: 1.2,
    pulseSpeed: 1.0,
    distortion: 0.1,
}

// ============================================================
// AvatarPanel
// ============================================================
export const AvatarPanel = () => {
    const {
        isAuthenticated,
        currentScene,
        avatarConfig,
        isLoadingScene,
        error,
        saveSceneSettings,
        saveAvatarConfig,
        clearError,
    } = useScenePersistence()

    const { activeCharacterId, setActiveCharacterId, mood, intensity } = useSoulStore()

    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'avatar' | 'scene' | 'shader'>('avatar')
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState<string | null>(null)

    // ---- Estado local del formulario ----
    const [colors, setColors] = useState<ColorConfig>(DEFAULT_COLORS)
    const [shaders, setShaders] = useState<ShaderConfig>(DEFAULT_SHADERS)
    const [sceneName, setSceneName] = useState('')
    const [sceneEnv, setSceneEnv] = useState('city')
    const [bgColor, setBgColor] = useState('#111111')
    const [ambientIntensity, setAmbientIntensity] = useState(0.5)

    // ---- Sincronizar desde DB cuando carga ----
    useEffect(() => {
        if (avatarConfig) {
            setColors({
                primary: avatarConfig.custom_colors?.primary ?? DEFAULT_COLORS.primary,
                secondary: avatarConfig.custom_colors?.secondary ?? DEFAULT_COLORS.secondary,
                glow: avatarConfig.custom_colors?.glow ?? DEFAULT_COLORS.glow,
                emission: avatarConfig.custom_colors?.emission ?? DEFAULT_COLORS.emission,
            })
            setShaders({
                wireframeOpacity: (avatarConfig.shader_params?.wireframeOpacity as number) ?? DEFAULT_SHADERS.wireframeOpacity,
                glowIntensity: (avatarConfig.shader_params?.glowIntensity as number) ?? DEFAULT_SHADERS.glowIntensity,
                pulseSpeed: (avatarConfig.shader_params?.pulseSpeed as number) ?? DEFAULT_SHADERS.pulseSpeed,
                distortion: (avatarConfig.shader_params?.distortion as number) ?? DEFAULT_SHADERS.distortion,
            })
        }
    }, [avatarConfig])

    useEffect(() => {
        if (currentScene) {
            setSceneName(currentScene.name)
            setSceneEnv(currentScene.environment)
            setBgColor(currentScene.background_color)
            setAmbientIntensity(currentScene.ambient_intensity)
        }
    }, [currentScene])

    // ---- Handlers ----
    const showSaveMsg = (msg: string) => {
        setSaveMsg(msg)
        setTimeout(() => setSaveMsg(null), 2500)
    }

    const handleSaveAvatar = async () => {
        setSaving(true)
        try {
            await saveAvatarConfig({
                character_id: null,
                config_name: 'Mi Avatar',
                custom_colors: colors,
                shader_params: shaders,
                is_active: true,
            })
            showSaveMsg('✅ Avatar guardado')
        } catch {
            showSaveMsg('❌ Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveScene = async () => {
        if (!currentScene) return
        setSaving(true)
        try {
            await saveSceneSettings({
                name: sceneName,
                environment: sceneEnv,
                background_color: bgColor,
                ambient_intensity: ambientIntensity,
            })
            showSaveMsg('✅ Escena guardada')
        } catch {
            showSaveMsg('❌ Error al guardar escena')
        } finally {
            setSaving(false)
        }
    }

    // ============================================================
    // Render — toggle button
    // ============================================================
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                title="Abrir panel de avatar"
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 20,
                    background: 'rgba(0, 204, 255, 0.15)',
                    border: '1px solid rgba(0, 204, 255, 0.4)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s',
                    color: '#00ccff',
                }}
            >
                🎛️
            </button>
        )
    }

    // ============================================================
    // Render — panel completo
    // ============================================================
    return (
        <div
            style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 20,
                width: '320px',
                background: 'rgba(10, 10, 20, 0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(0, 204, 255, 0.25)',
                borderRadius: '16px',
                color: 'white',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '13px',
                boxShadow: '0 0 40px rgba(0, 204, 255, 0.1)',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
                <span style={{ fontWeight: 'bold', color: '#00ccff', letterSpacing: '0.5px' }}>
                    ⚡ PhysicClaw Panel
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Auth status */}
                    <span
                        title={isAuthenticated ? 'Conectado' : 'Sin conexión'}
                        style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: isAuthenticated ? '#00ff88' : '#ff4444',
                            display: 'inline-block',
                        }}
                    />
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '16px' }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 50, 50, 0.15)',
                    borderBottom: '1px solid rgba(255,50,50,0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: '#ff8888',
                }}>
                    <span>⚠️ {error}</span>
                    <button
                        onClick={clearError}
                        style={{ background: 'none', border: 'none', color: '#ff8888', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Loading */}
            {isLoadingScene && (
                <div style={{ padding: '12px 16px', color: '#888', textAlign: 'center' }}>
                    Cargando escena...
                </div>
            )}

            {/* Status bar */}
            <div style={{
                padding: '8px 16px',
                display: 'flex',
                gap: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: '11px',
                color: '#666',
            }}>
                <span>Mood: <strong style={{ color: '#00ccff' }}>{mood}</strong></span>
                <span>Intensidad: <strong style={{ color: '#00ccff' }}>{intensity.toFixed(2)}</strong></span>
                {currentScene && <span style={{ marginLeft: 'auto' }}>📍 {currentScene.name}</span>}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {(['avatar', 'scene', 'shader'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            padding: '10px 0',
                            background: activeTab === tab ? 'rgba(0, 204, 255, 0.1)' : 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid #00ccff' : '2px solid transparent',
                            color: activeTab === tab ? '#00ccff' : '#666',
                            cursor: 'pointer',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tab === 'avatar' ? '🤖 Avatar' : tab === 'scene' ? '🌍 Escena' : '✨ Shader'}
                    </button>
                ))}
            </div>

            {/* Tab: Avatar */}
            {activeTab === 'avatar' && (
                <div style={{ padding: '16px' }}>
                    {/* Character selector */}
                    <label style={{ color: '#aaa', display: 'block', marginBottom: '6px' }}>Personaje activo</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                        {CHARACTERS.map(char => (
                            <button
                                key={char.id}
                                onClick={() => setActiveCharacterId(char.id)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: activeCharacterId === char.id ? '#00ccff' : 'rgba(255,255,255,0.1)',
                                    background: activeCharacterId === char.id ? 'rgba(0, 204, 255, 0.1)' : 'transparent',
                                    color: activeCharacterId === char.id ? '#00ccff' : '#aaa',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {activeCharacterId === char.id ? '● ' : '○ '}{char.name}
                                <span style={{ opacity: 0.5, marginLeft: '6px', fontSize: '10px' }}>
                                    ({char.type.toUpperCase()})
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Colors */}
                    <label style={{ color: '#aaa', display: 'block', marginBottom: '8px' }}>Colores del avatar</label>
                    {(Object.entries(colors) as [keyof ColorConfig, string][]).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <input
                                type="color"
                                value={value}
                                onChange={e => setColors(c => ({ ...c, [key]: e.target.value }))}
                                style={{ width: '32px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                            />
                            <span style={{ color: '#888', flex: 1, textTransform: 'capitalize' }}>{key}</span>
                            <span style={{ color: '#555', fontFamily: 'monospace', fontSize: '11px' }}>{value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Scene */}
            {activeTab === 'scene' && (
                <div style={{ padding: '16px' }}>
                    <label style={{ color: '#aaa', display: 'block', marginBottom: '6px' }}>Nombre de la escena</label>
                    <input
                        type="text"
                        value={sceneName}
                        onChange={e => setSceneName(e.target.value)}
                        style={inputStyle}
                    />

                    <label style={{ color: '#aaa', display: 'block', margin: '12px 0 6px' }}>Entorno</label>
                    <select
                        value={sceneEnv}
                        onChange={e => setSceneEnv(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                        {['apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse'].map(env => (
                            <option key={env} value={env}>{env}</option>
                        ))}
                    </select>

                    <label style={{ color: '#aaa', display: 'block', margin: '12px 0 6px' }}>Color de fondo</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                            style={{ width: '40px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                        <span style={{ color: '#555', fontFamily: 'monospace', fontSize: '12px' }}>{bgColor}</span>
                    </div>

                    <label style={{ color: '#aaa', display: 'block', margin: '12px 0 6px' }}>
                        Luz ambiental: <strong style={{ color: '#00ccff' }}>{ambientIntensity.toFixed(2)}</strong>
                    </label>
                    <input
                        type="range"
                        min="0" max="2" step="0.05"
                        value={ambientIntensity}
                        onChange={e => setAmbientIntensity(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#00ccff' }}
                    />
                </div>
            )}

            {/* Tab: Shader */}
            {activeTab === 'shader' && (
                <div style={{ padding: '16px' }}>
                    <label style={{ color: '#aaa', display: 'block', marginBottom: '12px' }}>
                        Parámetros del EnergyShader
                    </label>

                    {(Object.entries(shaders) as [keyof ShaderConfig, number][]).map(([key, value]) => {
                        const ranges: Record<keyof ShaderConfig, [number, number, number]> = {
                            wireframeOpacity: [0, 1, 0.01],
                            glowIntensity: [0, 3, 0.05],
                            pulseSpeed: [0, 5, 0.1],
                            distortion: [0, 1, 0.01],
                        }
                        const [min, max, step] = ranges[key]
                        const labels: Record<keyof ShaderConfig, string> = {
                            wireframeOpacity: 'Opacidad Wireframe',
                            glowIntensity: 'Intensidad de Glow',
                            pulseSpeed: 'Velocidad de Pulso',
                            distortion: 'Distorsión',
                        }
                        return (
                            <div key={key} style={{ marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#888', fontSize: '12px' }}>{labels[key]}</span>
                                    <span style={{ color: '#00ccff', fontFamily: 'monospace', fontSize: '11px' }}>
                                        {value.toFixed(2)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={min} max={max} step={step}
                                    value={value}
                                    onChange={e => setShaders(s => ({ ...s, [key]: parseFloat(e.target.value) }))}
                                    style={{ width: '100%', accentColor: '#00ccff' }}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Footer — botón guardar */}
            <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                {saveMsg ? (
                    <span style={{ fontSize: '12px', color: saveMsg.startsWith('✅') ? '#00ff88' : '#ff8888' }}>
                        {saveMsg}
                    </span>
                ) : (
                    <span style={{ fontSize: '11px', color: '#444' }}>
                        {isAuthenticated ? '🟢 Conectado a Supabase' : '🔴 Sin conexión'}
                    </span>
                )}

                <button
                    onClick={activeTab === 'scene' ? handleSaveScene : handleSaveAvatar}
                    disabled={saving || !isAuthenticated}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: saving || !isAuthenticated
                            ? 'rgba(255,255,255,0.05)'
                            : 'linear-gradient(135deg, #007bff, #00ccff)',
                        color: saving || !isAuthenticated ? '#444' : 'white',
                        fontWeight: 'bold',
                        cursor: saving || !isAuthenticated ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s',
                    }}
                >
                    {saving ? 'Guardando...' : '💾 Guardar'}
                </button>
            </div>
        </div>
    )
}

// ---- Shared styles ----
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    outline: 'none',
    fontSize: '12px',
    boxSizing: 'border-box',
}
