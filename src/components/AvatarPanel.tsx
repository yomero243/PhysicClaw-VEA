import { useState, useRef, useCallback } from 'react'
import { useSoulStore } from '../store/soulStore'
import { CHARACTERS } from '../constants/characters'

// ── Category definitions ──
const CATEGORIES = [
    { id: 'upload', label: 'Upload', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { id: 'shader', label: 'Shader', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'transform', label: 'Transform', icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' },
    { id: 'animations', label: 'Animations', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'connection', label: 'Connection', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
]

const SvgIcon = ({ path, size = 22 }: { path: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
    </svg>
)

// ── Category Content Components ──

const UploadCategory = () => {
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { customCharacters, addCustomCharacter, setActiveCharacterId, removeCustomCharacter } = useSoulStore()

    const processFiles = useCallback((files: File[]) => {
        files.forEach(file => {
            const ext = file.name.split('.').pop()?.toLowerCase()
            if (ext !== 'fbx' && ext !== 'glb') return
            const objectUrl = URL.createObjectURL(file)
            const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            addCustomCharacter({
                id,
                name: file.name.replace(/\.(fbx|glb)$/i, ''),
                modelUrl: objectUrl,
                type: ext as 'fbx' | 'glb',
                scale: ext === 'fbx' ? 0.01 : 1,
                position: [0, -1, 0],
            })
            setActiveCharacterId(id)
        })
    }, [addCustomCharacter, setActiveCharacterId])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        processFiles(Array.from(e.dataTransfer.files))
    }, [processFiles])

    return (
        <div>
            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragOver ? 'rgba(0, 123, 255, 0.8)' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: '12px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragOver ? 'rgba(0, 123, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s',
                    marginBottom: '16px',
                }}
            >
                <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.6 }}>
                    <SvgIcon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" size={32} />
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                    Drop FBX/GLB here
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                    or click to browse
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".fbx,.glb"
                    multiple
                    onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Uploaded Models List */}
            {customCharacters.length > 0 && (
                <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        Uploaded Models
                    </div>
                    {customCharacters.map(char => (
                        <div key={char.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            marginBottom: '4px',
                            fontSize: '13px',
                        }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {char.name}
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px' }}>
                                {char.type.toUpperCase()}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeCustomCharacter(char.id) }}
                                style={{
                                    marginLeft: '8px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,100,100,0.7)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                }}
                            >
                                x
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const ShaderCategory = () => {
    const { activeCharacterId, characterOverrides, setCharacterOverride } = useSoulStore()
    const overrides = characterOverrides[activeCharacterId] || {}

    const colorPresets = [
        { label: 'Cyan', value: '#00ffff' },
        { label: 'Purple', value: '#aa44ff' },
        { label: 'Pink', value: '#ff44aa' },
        { label: 'Green', value: '#44ff88' },
        { label: 'Gold', value: '#ffcc00' },
        { label: 'Red', value: '#ff4444' },
        { label: 'Blue', value: '#4488ff' },
        { label: 'White', value: '#ffffff' },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Color Picker */}
            <div>
                <label style={labelStyle}>Shader Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="color"
                        value={overrides.shaderColor ?? '#00ffff'}
                        onChange={(e) => setCharacterOverride(activeCharacterId, { shaderColor: e.target.value })}
                        style={{ width: '40px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                    />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        {overrides.shaderColor ?? '#00ffff'}
                    </span>
                </div>
            </div>

            {/* Color Presets */}
            <div>
                <label style={labelStyle}>Presets</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {colorPresets.map(p => (
                        <button
                            key={p.value}
                            onClick={() => setCharacterOverride(activeCharacterId, { shaderColor: p.value })}
                            style={{
                                width: '100%',
                                aspectRatio: '1',
                                borderRadius: '8px',
                                border: overrides.shaderColor === p.value ? '2px solid white' : '2px solid transparent',
                                background: p.value,
                                cursor: 'pointer',
                                transition: 'transform 0.15s',
                            }}
                            title={p.label}
                        />
                    ))}
                </div>
            </div>

            {/* Intensity */}
            <div>
                <label style={labelStyle}>Intensity</label>
                <input
                    type="range" min="0" max="2" step="0.05"
                    value={overrides.intensity ?? 0.5}
                    onChange={(e) => setCharacterOverride(activeCharacterId, { intensity: parseFloat(e.target.value) })}
                    style={sliderStyle}
                />
                <div style={sliderValueStyle}>{(overrides.intensity ?? 0.5).toFixed(2)}</div>
            </div>

            {/* Shader Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ ...labelStyle, margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={overrides.useEnergyShader ?? true}
                        onChange={(e) => setCharacterOverride(activeCharacterId, { useEnergyShader: e.target.checked })}
                        style={{ accentColor: '#007bff' }}
                    />
                    Energy Shader
                </label>
            </div>
        </div>
    )
}

const TransformCategory = () => {
    const { activeCharacterId, characterOverrides, setCharacterOverride, customCharacters } = useSoulStore()
    const overrides = characterOverrides[activeCharacterId] || {}
    const allChars = [...CHARACTERS, ...customCharacters]
    const baseConfig = allChars.find(c => c.id === activeCharacterId)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label style={labelStyle}>Scale</label>
                <input
                    type="range" min="0.001" max="3" step="0.001"
                    value={overrides.scale ?? baseConfig?.scale ?? 1}
                    onChange={(e) => setCharacterOverride(activeCharacterId, { scale: parseFloat(e.target.value) })}
                    style={sliderStyle}
                />
                <div style={sliderValueStyle}>{(overrides.scale ?? baseConfig?.scale ?? 1).toFixed(3)}</div>
            </div>

            <div>
                <label style={labelStyle}>Y Position</label>
                <input
                    type="range" min="-3" max="3" step="0.1"
                    value={overrides.positionY ?? baseConfig?.position[1] ?? 0}
                    onChange={(e) => setCharacterOverride(activeCharacterId, { positionY: parseFloat(e.target.value) })}
                    style={sliderStyle}
                />
                <div style={sliderValueStyle}>{(overrides.positionY ?? baseConfig?.position[1] ?? 0).toFixed(1)}</div>
            </div>
        </div>
    )
}

const AnimationsCategory = () => {
    const { mood, setMood, intensity, setIntensity } = useSoulStore()
    const moods = ['calm', 'excited', 'thinking', 'listening']

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label style={labelStyle}>Mood</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {moods.map(m => (
                        <button
                            key={m}
                            onClick={() => setMood(m)}
                            style={{
                                padding: '10px 8px',
                                borderRadius: '8px',
                                border: 'none',
                                background: mood === m ? '#007bff' : 'rgba(255,255,255,0.08)',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                transition: 'background 0.2s',
                            }}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label style={labelStyle}>Global Intensity</label>
                <input
                    type="range" min="0" max="2" step="0.05"
                    value={intensity}
                    onChange={(e) => setIntensity(parseFloat(e.target.value))}
                    style={sliderStyle}
                />
                <div style={sliderValueStyle}>{intensity.toFixed(2)}</div>
            </div>
        </div>
    )
}

const PresetsCategory = () => {
    const { activeCharacterId, setActiveCharacterId, customCharacters, removeCustomCharacter } = useSoulStore()
    const allCharacters = [...CHARACTERS, ...customCharacters]

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {allCharacters.map(char => (
                    <div
                        key={char.id}
                        onClick={() => setActiveCharacterId(char.id)}
                        style={{
                            padding: '14px 10px',
                            borderRadius: '10px',
                            background: activeCharacterId === char.id ? 'rgba(0, 123, 255, 0.3)' : 'rgba(255,255,255,0.05)',
                            border: activeCharacterId === char.id ? '1px solid rgba(0, 123, 255, 0.6)' : '1px solid rgba(255,255,255,0.08)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                            position: 'relative',
                        }}
                    >
                        <div style={{ fontSize: '24px', marginBottom: '6px', opacity: 0.6 }}>
                            {char.modelUrl ? (
                                <SvgIcon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" size={28} />
                            ) : (
                                <SvgIcon path="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={28} />
                            )}
                        </div>
                        <div style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {char.name}
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                            {char.type.toUpperCase()}
                        </div>
                        {char.id.startsWith('custom-') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeCustomCharacter(char.id) }}
                                style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    background: 'rgba(255,60,60,0.6)',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1,
                                }}
                            >
                                x
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

const SettingsCategory = () => {
    const { characterOverrides, activeCharacterId, setCharacterOverride } = useSoulStore()
    const overrides = characterOverrides[activeCharacterId] || {}

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                Active: <strong style={{ color: 'white' }}>{activeCharacterId}</strong>
            </div>

            <button
                onClick={() => setCharacterOverride(activeCharacterId, {
                    scale: undefined,
                    shaderColor: undefined,
                    intensity: undefined,
                    useEnergyShader: undefined,
                    positionY: undefined,
                })}
                style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,100,100,0.3)',
                    background: 'rgba(255,100,100,0.1)',
                    color: '#ff8888',
                    fontSize: '12px',
                    cursor: 'pointer',
                }}
            >
                Reset All Overrides
            </button>

            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                Overrides: {JSON.stringify(overrides, null, 0) || 'none'}
            </div>
        </div>
    )
}

const ConnectionCategory = () => {
    const { apiBaseUrl, apiModel, apiToken, setApiConfig } = useSoulStore()
    const [showToken, setShowToken] = useState(false)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: '4px' }}>
                Connect your own proxy or API. Leave URL blank to use the default local proxy. Changes are saved automatically.
            </div>

            <div>
                <label style={labelStyle}>API Provider URL</label>
                <input
                    type="text"
                    value={apiBaseUrl}
                    onChange={(e) => setApiConfig({ apiBaseUrl: e.target.value })}
                    placeholder="Leave empty for local proxy"
                    style={inputStyle}
                />
            </div>

            <div>
                <label style={labelStyle}>Model ID</label>
                <input
                    type="text"
                    value={apiModel}
                    onChange={(e) => setApiConfig({ apiModel: e.target.value })}
                    placeholder="claude-3-5-sonnet-20241022"
                    style={inputStyle}
                />
            </div>

            <div>
                <label style={labelStyle}>API Token (Bearer)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                        type={showToken ? "text" : "password"}
                        value={apiToken}
                        onChange={(e) => setApiConfig({ apiToken: e.target.value })}
                        placeholder="sk-ant-api03-..."
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                        onClick={() => setShowToken(!showToken)}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '0 10px',
                            fontSize: '12px',
                        }}
                    >
                        {showToken ? "Hide" : "Show"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Category content map ──
const CATEGORY_CONTENT: Record<string, React.FC> = {
    upload: UploadCategory,
    shader: ShaderCategory,
    transform: TransformCategory,
    animations: AnimationsCategory,
    presets: PresetsCategory,
    settings: SettingsCategory,
    connection: ConnectionCategory,
}

// ── Main AvatarPanel ──
export const AvatarPanel = () => {
    const { activeCategoryId, setActiveCategoryId } = useSoulStore()
    const CategoryContent = activeCategoryId ? CATEGORY_CONTENT[activeCategoryId] : null

    return (
        <div style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
            {/* Icon Sidebar */}
            <div style={{
                width: '52px',
                background: 'rgba(15, 15, 25, 0.95)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '12px',
                gap: '4px',
                zIndex: 2,
            }}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategoryId(cat.id)}
                        title={cat.label}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            border: 'none',
                            background: activeCategoryId === cat.id ? 'rgba(0, 123, 255, 0.35)' : 'transparent',
                            color: activeCategoryId === cat.id ? '#4da6ff' : 'rgba(255,255,255,0.45)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                    >
                        <SvgIcon path={cat.icon} size={20} />
                    </button>
                ))}
            </div>

            {/* Category Panel (slides in/out) */}
            <div style={{
                width: activeCategoryId ? '280px' : '0px',
                overflow: 'hidden',
                transition: 'width 0.25s ease',
                background: 'rgba(20, 20, 30, 0.92)',
                backdropFilter: 'blur(12px)',
                borderRight: activeCategoryId ? '1px solid rgba(255,255,255,0.08)' : 'none',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {activeCategoryId && (
                    <div style={{ padding: '16px', overflowY: 'auto', flex: 1, minWidth: '280px' }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            paddingBottom: '12px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'white' }}>
                                {CATEGORIES.find(c => c.id === activeCategoryId)?.label}
                            </h3>
                            <button
                                onClick={() => setActiveCategoryId(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    padding: '2px 6px',
                                }}
                            >
                                x
                            </button>
                        </div>

                        {/* Dynamic Content */}
                        {CategoryContent && <CategoryContent />}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Shared Styles ──
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: '6px',
}

const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: '#007bff',
    cursor: 'pointer',
}

const sliderValueStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'right',
    marginTop: '2px',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(0, 0, 0, 0.4)',
    color: 'white',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
}
