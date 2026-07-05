// ============================================================
// PhysicClaw-VEA — GLB Upload Panel
// ============================================================
import { useState, useRef, useCallback } from 'react'
import { useSoulStore } from '../store/soulStore'
import { MODEL_UPLOAD, type RigType } from '../lib/constraints'
import type { CharacterId } from '../lib/constraints'
import type { CharacterConfig } from '../constants/characters'
import { CHARACTERS } from '../constants/characters'
import { supabase } from '../lib/supabase'

// ─── Helpers ─────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function sanitizeStorageFileName(name: string): string {
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 96)
    return safeName.toLowerCase().endsWith('.glb') ? safeName : `${safeName || 'model'}.glb`
}

function makeCustomCharacterId(): CharacterId {
    const suffix = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    return `custom-${suffix}` as CharacterId
}

interface UploadedModel {
    file: File
    objectUrl: string
    name: string
}

// ─── Main Component ──────────────────────────────────────────

export const GLBUploadPanel = () => {
    const [open, setOpen] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const [model, setModel] = useState<UploadedModel | null>(null)
    const [modelName, setModelName] = useState('')
    const [scale, setScale] = useState(1)
    const [posY, setPosY] = useState(-1)
    const [rigType, setRigType] = useState<RigType>('mixamo')
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const {
        addCustomCharacter,
        customCharacters,
        removeCustomCharacter,
        visibleObjects,
        toggleObjectVisibility,
        setCustomModelUrl,
    } = useSoulStore()
    const userId = useSoulStore((s) => s.userId)
    const allObjects = [...CHARACTERS, ...customCharacters]

    const clearFlash = () => { setError(null); setSuccess(null) }

    const handleFile = useCallback((file: File) => {
        clearFlash()

        if (!file.name.toLowerCase().endsWith('.glb')) {
            setError('Only .glb files are accepted')
            return
        }
        if (file.size > MODEL_UPLOAD.MAX_BYTES) {
            setError(`File too large (max ${formatBytes(MODEL_UPLOAD.MAX_BYTES)})`)
            return
        }

        // Revoke previous blob URL
        if (model) URL.revokeObjectURL(model.objectUrl)

        const objectUrl = URL.createObjectURL(file)
        const name = file.name.replace(/\.glb$/i, '')
        setModel({ file, objectUrl, name })
        setModelName(name)
    }, [model])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    const handleAdd = async () => {
        if (!model) return
        clearFlash()
        setUploading(true)

        try {
            let modelUrl = model.objectUrl
            let storagePath: string | undefined

            // Upload to Supabase Storage if authenticated
            if (userId) {
                const filePath = `${userId}/${crypto.randomUUID()}_${sanitizeStorageFileName(model.file.name)}`
                const { error: uploadErr } = await supabase.storage
                    .from('models')
                    .upload(filePath, model.file, { contentType: 'model/gltf-binary' })

                if (uploadErr) {
                    console.warn('[GLBUpload] Storage upload failed, using local blob:', uploadErr.message)
                } else {
                    const { data: signedData, error: signedErr } = await supabase.storage
                        .from('models')
                        .createSignedUrl(filePath, MODEL_UPLOAD.SIGNED_URL_SECONDS)

                    if (signedErr || !signedData?.signedUrl) {
                        throw new Error(signedErr?.message ?? 'Could not create signed model URL')
                    }

                    modelUrl = signedData.signedUrl
                    storagePath = filePath
                }
            }

            const id = makeCustomCharacterId()
            const config: CharacterConfig = {
                id,
                name: modelName || model.name,
                modelUrl,
                storagePath,
                type: 'glb',
                scale,
                position: [0, posY, 0.5],
                rigType,
            }

            addCustomCharacter(config)
            if (storagePath) {
                setCustomModelUrl(id, modelUrl)
                URL.revokeObjectURL(model.objectUrl)
            }

            // Reset form
            setModel(null)
            setModelName('')
            setScale(1)
            setPosY(-1)
            setSuccess(storagePath ? 'Model uploaded!' : 'Model loaded locally (not persisted)')
            setTimeout(() => setSuccess(null), 2500)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = (id: string) => {
        removeCustomCharacter(id)
        setSuccess('Model removed')
        setTimeout(() => setSuccess(null), 2000)
    }

    // ── Closed state ─────────────────────────────────────────
    if (!open) {
        return (
            <button onClick={() => setOpen(true)} title="Upload GLB model"
                style={{
                    position: 'absolute', top: 20, right: 60, zIndex: 20,
                    width: 44, height: 44, borderRadius: 4,
                    background: 'rgba(12,9,18,0.75)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(240,171,252,0.25)',
                    color: '#F0ABFC', fontSize: 18, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(240,171,252,0.1)',
                    transition: 'all 0.2s',
                    fontFamily: '"JetBrains Mono", "Courier New", monospace',
                }}>
                +
            </button>
        )
    }

    // ── Open panel ───────────────────────────────────────────
    return (
        <>
            <style>{`
                .glb-panel-scroll::-webkit-scrollbar { width: 3px; }
                .glb-panel-scroll::-webkit-scrollbar-track { background: transparent; }
                .glb-panel-scroll::-webkit-scrollbar-thumb { background: rgba(240,171,252,0.2); border-radius: 2px; }
            `}</style>

            <div style={{
                position: 'absolute', top: 20, right: 60, zIndex: 20,
                width: 320,
                background: 'rgba(12,9,18,0.92)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(240,171,252,0.18)',
                borderRadius: 6,
                boxShadow: '0 0 40px rgba(240,171,252,0.06), 0 16px 40px rgba(0,0,0,0.5)',
                fontFamily: '"JetBrains Mono", "Courier New", monospace',
                overflow: 'hidden',
            }}>
                {/* Top accent */}
                <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #F0ABFC, transparent)' }} />

                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(240,171,252,0.08)',
                }}>
                    <span style={{ fontSize: 11, letterSpacing: 3, color: '#F0ABFC', fontWeight: 700 }}>
                        GLB<span style={{ color: 'rgba(240,171,252,0.3)' }}>::UPLOAD</span>
                    </span>
                    <button onClick={() => setOpen(false)}
                        style={{ background: 'none', border: 'none', color: '#7A5FD0', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="glb-panel-scroll" style={{ maxHeight: 460, overflowY: 'auto', padding: 14 }}>

                    {/* Error / Success banner */}
                    {error && (
                        <div style={{
                            padding: '7px 10px', marginBottom: 10, borderRadius: 3,
                            background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)',
                            color: '#FB7185', fontSize: 10, letterSpacing: 1,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span>{error}</span>
                            <button onClick={() => setError(null)}
                                style={{ background: 'none', border: 'none', color: '#FB7185', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>
                    )}
                    {success && (
                        <div style={{
                            padding: '7px 10px', marginBottom: 10, borderRadius: 3,
                            background: 'rgba(240,171,252,0.06)', border: '1px solid rgba(240,171,252,0.2)',
                            color: '#F0ABFC', fontSize: 10, letterSpacing: 1,
                        }}>
                            {success}
                        </div>
                    )}

                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        style={{
                            padding: model ? '12px' : '28px 12px',
                            border: `2px dashed ${dragOver ? '#F0ABFC' : model ? 'rgba(240,171,252,0.3)' : 'rgba(240,171,252,0.12)'}`,
                            borderRadius: 4,
                            background: dragOver ? 'rgba(240,171,252,0.06)' : 'rgba(19,15,28,0.4)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center',
                            marginBottom: 14,
                        }}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".glb"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFile(file)
                                e.target.value = ''
                            }}
                        />

                        {model ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 4,
                                    background: 'rgba(240,171,252,0.1)',
                                    border: '1px solid rgba(240,171,252,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16, color: '#F0ABFC', flexShrink: 0,
                                }}>
                                    ◆
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <div style={{ fontSize: 11, color: '#D6CFF2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {model.file.name}
                                    </div>
                                    <div style={{ fontSize: 9, color: '#7A5FD0', letterSpacing: 1, marginTop: 2 }}>
                                        {formatBytes(model.file.size)}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); URL.revokeObjectURL(model.objectUrl); setModel(null) }}
                                    style={{ background: 'none', border: 'none', color: '#7A5FD0', cursor: 'pointer', fontSize: 12 }}>
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ fontSize: 24, color: 'rgba(240,171,252,0.3)', marginBottom: 8 }}>+</div>
                                <div style={{ fontSize: 10, color: '#7A5FD0', letterSpacing: 2 }}>
                                    DROP .GLB HERE
                                </div>
                                <div style={{ fontSize: 9, color: 'rgba(240,171,252,0.2)', marginTop: 4 }}>
                                    or click to browse — max {formatBytes(MODEL_UPLOAD.MAX_BYTES)}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Config fields (show when file selected) */}
                    {model && (
                        <>
                            {/* Name */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(240,171,252,0.4)', marginBottom: 5 }}>
                                    MODEL NAME
                                </div>
                                <input
                                    type="text" value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                    placeholder="My Model"
                                    style={{
                                        width: '100%', padding: '8px 12px', boxSizing: 'border-box',
                                        background: 'rgba(19,15,28,0.6)',
                                        border: '1px solid rgba(240,171,252,0.15)',
                                        borderRadius: 4, color: '#D6CFF2',
                                        fontSize: 11, fontFamily: '"JetBrains Mono", "Courier New", monospace',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Scale */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(240,171,252,0.4)' }}>SCALE</span>
                                    <span style={{ fontSize: 10, color: '#F0ABFC' }}>{scale.toFixed(2)}</span>
                                </div>
                                <div style={{ position: 'relative', height: 3, background: 'rgba(240,171,252,0.1)', borderRadius: 2 }}>
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
                                        width: `${(scale / 5) * 100}%`,
                                        background: 'linear-gradient(to right, rgba(240,171,252,0.4), #F0ABFC)',
                                    }} />
                                    <input type="range" min={0.01} max={5} step={0.01} value={scale}
                                        onChange={(e) => setScale(parseFloat(e.target.value))}
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                                    />
                                </div>
                            </div>

                            {/* Position Y */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(240,171,252,0.4)' }}>HEIGHT (Y)</span>
                                    <span style={{ fontSize: 10, color: '#F0ABFC' }}>{posY.toFixed(2)}</span>
                                </div>
                                <div style={{ position: 'relative', height: 3, background: 'rgba(240,171,252,0.1)', borderRadius: 2 }}>
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
                                        width: `${((posY + 3) / 6) * 100}%`,
                                        background: 'linear-gradient(to right, rgba(240,171,252,0.4), #F0ABFC)',
                                    }} />
                                    <input type="range" min={-3} max={3} step={0.05} value={posY}
                                        onChange={(e) => setPosY(parseFloat(e.target.value))}
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                                    />
                                </div>
                            </div>

                            {/* Rig type */}
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(240,171,252,0.4)', marginBottom: 5 }}>
                                    RIG TYPE
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <select value={rigType} onChange={(e) => setRigType(e.target.value as RigType)}
                                        style={{
                                            width: '100%', padding: '8px 12px',
                                            background: 'rgba(19,15,28,0.6)',
                                            border: '1px solid rgba(240,171,252,0.15)',
                                            borderRadius: 4, color: '#D6CFF2',
                                            fontSize: 11, fontFamily: '"JetBrains Mono", "Courier New", monospace',
                                            outline: 'none', cursor: 'pointer', appearance: 'none',
                                        }}>
                                        {MODEL_UPLOAD.RIG_TYPES.map((r) => (
                                            <option key={r} value={r} style={{ background: '#0A0614', color: '#D6CFF2' }}>
                                                {r.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,171,252,0.4)', pointerEvents: 'none', fontSize: 10 }}>
                                        ▾
                                    </span>
                                </div>
                            </div>

                            {/* Add button */}
                            <button
                                onClick={handleAdd}
                                disabled={uploading || !modelName.trim()}
                                style={{
                                    width: '100%', padding: '10px 0', borderRadius: 4,
                                    border: `1px solid ${uploading || !modelName.trim() ? 'rgba(240,171,252,0.1)' : '#F0ABFC'}`,
                                    background: uploading || !modelName.trim() ? 'transparent' : 'linear-gradient(135deg, rgba(240,171,252,0.15), rgba(240,171,252,0.05))',
                                    color: uploading || !modelName.trim() ? '#2a5a4a' : '#F0ABFC',
                                    fontSize: 10, fontFamily: '"JetBrains Mono", "Courier New", monospace', fontWeight: 700, letterSpacing: 2,
                                    cursor: uploading || !modelName.trim() ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                    boxShadow: uploading || !modelName.trim() ? 'none' : '0 0 10px rgba(240,171,252,0.15)',
                                }}>
                                {uploading ? 'LOADING...' : 'ADD TO SCENE'}
                            </button>
                        </>
                    )}

                    {/* Scene objects list with visibility toggles */}
                    <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(240,171,252,0.15), transparent)', margin: '14px 0' }} />
                    <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(240,171,252,0.4)', marginBottom: 10 }}>
                        SCENE OBJECTS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {allObjects.map((char) => {
                            const isVisible = !!visibleObjects[char.id]
                            const isCustom = customCharacters.some((c) => c.id === char.id)
                            return (
                                <div key={char.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '7px 10px', borderRadius: 3,
                                        border: `1px solid ${isVisible ? 'rgba(240,171,252,0.25)' : 'rgba(255,255,255,0.06)'}`,
                                        background: isVisible ? 'rgba(240,171,252,0.05)' : 'rgba(255,255,255,0.02)',
                                        transition: 'all 0.15s',
                                    }}>
                                    {/* Visibility toggle */}
                                    <button
                                        onClick={() => toggleObjectVisibility(char.id)}
                                        title={isVisible ? 'Hide' : 'Show'}
                                        style={{
                                            width: 22, height: 22, borderRadius: 3, flexShrink: 0,
                                            background: isVisible ? 'rgba(240,171,252,0.15)' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${isVisible ? 'rgba(240,171,252,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                            color: isVisible ? '#F0ABFC' : '#3a3a3a',
                                            fontSize: 11, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s',
                                            padding: 0,
                                        }}>
                                        {isVisible ? '◉' : '○'}
                                    </button>

                                    {/* Name */}
                                    <span style={{
                                        flex: 1, fontSize: 10, fontFamily: '"JetBrains Mono", "Courier New", monospace',
                                        letterSpacing: 1,
                                        color: isVisible ? '#D6CFF2' : '#3A3352',
                                        transition: 'color 0.15s',
                                    }}>
                                        {char.name.toUpperCase()}
                                    </span>

                                    {/* Type badge */}
                                    <span style={{
                                        fontSize: 8, letterSpacing: 1, padding: '2px 5px', borderRadius: 2,
                                        background: isCustom ? 'rgba(240,171,252,0.08)' : 'rgba(167,139,250,0.08)',
                                        color: isCustom ? 'rgba(240,171,252,0.5)' : 'rgba(167,139,250,0.5)',
                                    }}>
                                        {isCustom ? 'GLB' : 'BASE'}
                                    </span>

                                    {/* Remove button (custom only) */}
                                    {isCustom && (
                                        <button
                                            onClick={() => handleRemove(char.id)}
                                            style={{
                                                background: 'none', border: 'none',
                                                color: '#5a3a3a', cursor: 'pointer', fontSize: 11,
                                                padding: '0 2px',
                                            }}
                                            title="Remove model">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Bottom accent */}
                <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(240,171,252,0.12), transparent)' }} />
            </div>
        </>
    )
}
