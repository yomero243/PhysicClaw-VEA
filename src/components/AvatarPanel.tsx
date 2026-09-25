// ============================================================
// PhysicClaw-VEA — AvatarPanel (Cyber Redesign)
// ============================================================
import React, { useState, useEffect, memo } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { CHARACTERS } from '../constants/characters'
import { useSoulStore } from '../store/soulStore'
import { COMPACT, useCompactLayout } from '../hooks/useCompactLayout'

interface ColorConfig {
  primary: string; secondary: string; glow: string; emission: string
}
interface ShaderConfig {
  wireframeOpacity: number; glowIntensity: number; pulseSpeed: number; distortion: number
  [key: string]: unknown
}

const DEFAULT_COLORS: ColorConfig = { primary: '#8CFFB0', secondary: '#7700ff', glow: '#C9F36A', emission: '#ffffff' }
const DEFAULT_SHADERS: ShaderConfig = { wireframeOpacity: 0.3, glowIntensity: 1.2, pulseSpeed: 1.0, distortion: 0.1 }

const ENVS = ['apartment','city','dawn','forest','lobby','night','park','studio','sunset','warehouse']

type Tab = 'avatar' | 'scene' | 'shader' | 'bot'

const PRESET_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
]

// ─── Small atoms ──────────────────────────────────────────────────

const PanelLabel = memo(function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(var(--accent-rgb), 0.4)', marginBottom: 10, fontFamily: '"Courier New", monospace' }}>
      {children}
    </div>
  )
})

const Divider = memo(function Divider() {
  return <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(var(--accent-rgb), 0.15), transparent)', margin: '14px 0' }} />
})

const CyberSlider = memo(function CyberSlider({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: '"Courier New", monospace' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: '"Courier New", monospace' }}>{value.toFixed(2)}</span>
      </div>
      <div style={{ position: 'relative', height: 3, background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: 2 }}>
        <div style={{
          position: 'absolute' as const, left: 0, top: 0, height: '100%', borderRadius: 2,
          width: `${((value - min) / (max - min)) * 100}%`,
          background: 'linear-gradient(to right, rgba(var(--accent-rgb), 0.4), var(--accent))',
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', margin: 0,
          }}
        />
      </div>
    </div>
  )
})

const ColorRow = memo(function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 3,
          background: value,
          border: '1px solid rgba(var(--accent-rgb), 0.2)',
          boxShadow: `0 0 8px ${value}44`,
        }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', border: 'none', padding: 0 }}
        />
      </div>
      <span style={{ flex: 1, fontSize: 11, color: 'var(--dim)', fontFamily: '"Courier New", monospace', textTransform: 'capitalize' }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: '"Courier New", monospace' }}>{value.toUpperCase()}</span>
    </div>
  )
})

const CyberSelect = memo(function CyberSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px',
          background: 'rgba(var(--panel-rgb), 0.6)',
          border: '1px solid rgba(var(--accent-rgb), 0.15)',
          borderRadius: 4, color: 'var(--text)',
          fontSize: 11, fontFamily: '"Courier New", monospace',
          outline: 'none', cursor: 'pointer',
          appearance: 'none',
        }}>
        {options.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(var(--accent-rgb), 0.4)', pointerEvents: 'none', fontSize: 10 }}>▾</span>
    </div>
  )
})

const CyberInput = memo(function CyberInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '8px 12px', boxSizing: 'border-box',
        background: 'rgba(var(--panel-rgb), 0.6)',
        border: `1px solid ${focused ? 'rgba(var(--accent-rgb), 0.45)' : 'rgba(var(--accent-rgb), 0.15)'}`,
        borderRadius: 4, color: 'var(--text)',
        fontSize: 11, fontFamily: '"Courier New", monospace',
        outline: 'none', transition: 'border-color 0.2s',
      }}
    />
  )
})

const SaveButton = memo(function SaveButton({ onClick, disabled, saving }: { onClick: () => void; disabled: boolean; saving: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '8px 20px', borderRadius: 4,
        border: `1px solid ${disabled ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--accent)'}`,
        background: disabled ? 'transparent' : 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.15), rgba(var(--accent-rgb), 0.05))',
        color: disabled ? 'var(--muted)' : 'var(--accent)',
        fontSize: 10, fontFamily: '"Courier New", monospace', fontWeight: 700, letterSpacing: 2,
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
        boxShadow: disabled ? 'none' : '0 0 10px rgba(var(--accent-rgb), 0.15)',
      }}>
      {saving ? 'SAVING...' : 'SAVE'}
    </button>
  )
})

// ─── Main Component ───────────────────────────────────────────────
export const AvatarPanel = () => {
  // Selectores granulares para no re-renderizar el panel con cada mensaje guardado
  const currentScene = useSceneStore(s => s.currentScene)
  const avatarConfig = useSceneStore(s => s.avatarConfig)
  const isLoadingScene = useSceneStore(s => s.isLoadingScene)
  const error = useSceneStore(s => s.error)
  const saveSceneSettings = useSceneStore(s => s.saveSceneSettings)
  const saveAvatarConfig = useSceneStore(s => s.saveAvatarConfig)
  const clearError = useSceneStore(s => s.clearError)

  // Selectores granulares para evitar re-renders de todo el panel
  const activeCharacterId = useSoulStore(s => s.activeCharacterId)
  const setActiveCharacterId = useSoulStore(s => s.setActiveCharacterId)
  const mood = useSoulStore(s => s.mood)
  const intensity = useSoulStore(s => s.intensity)
  const apiModel = useSoulStore(s => s.apiModel)
  const setApiConfig = useSoulStore(s => s.setApiConfig)

  const [open, setOpen] = useState(false)
  const compact = useCompactLayout()
  const [tab, setTab] = useState<Tab>('avatar')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Bot states
  const [botModel, setBotModel] = useState(apiModel)

  const [colors, setColors] = useState<ColorConfig>(DEFAULT_COLORS)
  const [shaders, setShaders] = useState<ShaderConfig>(DEFAULT_SHADERS)
  const [sceneName, setSceneName] = useState('')
  const [sceneEnv, setSceneEnv] = useState('city')
  const [bgColor, setBgColor] = useState('#0A0B0A')
  const [ambientIntensity, setAmbientIntensity] = useState(0.5)

  useEffect(function syncAvatarConfig() {
    if (avatarConfig) {
      setColors({
        primary:   avatarConfig.custom_colors?.primary   ?? DEFAULT_COLORS.primary,
        secondary: avatarConfig.custom_colors?.secondary ?? DEFAULT_COLORS.secondary,
        glow:      avatarConfig.custom_colors?.glow      ?? DEFAULT_COLORS.glow,
        emission:  avatarConfig.custom_colors?.emission  ?? DEFAULT_COLORS.emission,
      })
      setShaders({
        wireframeOpacity: (avatarConfig.shader_params?.wireframeOpacity as number) ?? DEFAULT_SHADERS.wireframeOpacity,
        glowIntensity:    (avatarConfig.shader_params?.glowIntensity    as number) ?? DEFAULT_SHADERS.glowIntensity,
        pulseSpeed:       (avatarConfig.shader_params?.pulseSpeed       as number) ?? DEFAULT_SHADERS.pulseSpeed,
        distortion:       (avatarConfig.shader_params?.distortion       as number) ?? DEFAULT_SHADERS.distortion,
      })
    }
  }, [avatarConfig])

  useEffect(function syncCurrentScene() {
    if (currentScene) {
      setSceneName(currentScene.name)
      setSceneEnv(currentScene.environment)
      setBgColor(currentScene.background_color)
      setAmbientIntensity(currentScene.ambient_intensity)
    }
  }, [currentScene])

  const flash = (text: string, ok: boolean) => {
    setSaveMsg({ text, ok })
    setTimeout(() => setSaveMsg(null), 2500)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (tab === 'scene') {
        await saveSceneSettings({ name: sceneName, environment: sceneEnv, background_color: bgColor, ambient_intensity: ambientIntensity })
        flash('SCENE SAVED', true)
      } else if (tab === 'bot') {
        setApiConfig({ apiModel: botModel })
        flash('BOT CONFIG SAVED', true)
      } else {
        await saveAvatarConfig({ character_id: null, config_name: 'Mi Avatar', custom_colors: colors, shader_params: shaders, is_active: true })
        flash('AVATAR SAVED', true)
      }
    } catch {
      flash('SAVE FAILED', false)
    } finally {
      setSaving(false)
    }
  }

  // ── Closed state: floating trigger button ──────────────────────
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Open panel"
        style={{
          position: 'absolute', top: 20, left: 20, zIndex: 20,
          width: 44, height: 44, borderRadius: 4,
          ...(compact ? { top: COMPACT.EDGE, left: COMPACT.EDGE, width: COMPACT.BUTTON, height: COMPACT.BUTTON } : {}),
          background: 'rgba(var(--panel-deep-rgb), 0.75)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(var(--accent-rgb), 0.25)',
          color: 'var(--accent)', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(var(--accent-rgb), 0.1)',
          transition: 'all 0.2s',
          fontFamily: '"Courier New", monospace',
        }}>
        ⊞
      </button>
    )
  }

  // ── Open panel ─────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .vea-panel-scroll::-webkit-scrollbar { width: 3px; }
        .vea-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .vea-panel-scroll::-webkit-scrollbar-thumb { background: rgba(var(--accent-rgb), 0.2); border-radius: 2px; }
        select option { background: var(--bg-deep); color: var(--text); }
      `}</style>

      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 20,
        width: 300,
        // Full-width on phones, and above the + button it would otherwise sit under.
        ...(compact ? { zIndex: 25, top: COMPACT.EDGE, left: COMPACT.EDGE, right: COMPACT.EDGE, width: 'auto', maxHeight: `calc(100dvh - ${COMPACT.EDGE * 2}px)`, overflowY: 'auto' as const } : {}),
        background: 'rgba(var(--panel-deep-rgb), 0.90)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(var(--accent-rgb), 0.18)',
        borderRadius: 6,
        boxShadow: '0 0 40px rgba(var(--accent-rgb), 0.06), 0 16px 40px rgba(0,0,0,0.5)',
        fontFamily: '"Courier New", monospace',
        overflow: 'hidden',
      }}>

        {/* top accent bar */}
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, var(--accent), transparent)' }} />

        {/* corner ornaments */}
        {[
          { top: 5, left: 5, borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)' },
          { top: 5, right: 5, borderTop: '1px solid var(--accent)', borderRight: '1px solid var(--accent)' },
          { bottom: 5, left: 5, borderBottom: '1px solid rgba(var(--accent-rgb), 0.3)', borderLeft: '1px solid rgba(var(--accent-rgb), 0.3)' },
          { bottom: 5, right: 5, borderBottom: '1px solid rgba(var(--accent-rgb), 0.3)', borderRight: '1px solid rgba(var(--accent-rgb), 0.3)' },
        ].map((s, i) => (
          <span key={i} style={{ position: 'absolute', width: 10, height: 10, ...s as React.CSSProperties }} />
        ))}

        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(var(--accent-rgb), 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: 3, color: 'var(--accent)', fontWeight: 700 }}>
              VEA<span style={{ color: 'rgba(var(--accent-rgb), 0.3)' }}>::PANEL</span>
            </span>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* ── Status bar ── */}
        <div style={{
          padding: '6px 14px',
          display: 'flex', gap: 14, alignItems: 'center',
          borderBottom: '1px solid rgba(var(--accent-rgb), 0.06)',
          fontSize: 9, letterSpacing: 2,
        }}>
          <span style={{ color: 'var(--muted)' }}>MOOD <span style={{ color: 'var(--accent)' }}>{mood.toUpperCase()}</span></span>
          <span style={{ color: 'var(--muted)' }}>INT <span style={{ color: 'var(--accent)' }}>{intensity.toFixed(2)}</span></span>
          {currentScene && (
            <span style={{ marginLeft: 'auto', color: 'var(--line)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
              {currentScene.name.toUpperCase()}
            </span>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            padding: '7px 14px', fontSize: 10, letterSpacing: 1,
            background: 'rgba(var(--danger-rgb), 0.08)', borderBottom: '1px solid rgba(var(--danger-rgb), 0.2)',
            color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>⚠ {error}</span>
            <button onClick={clearError} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
        )}

        {/* ── Loading ── */}
        {isLoadingScene && (
          <div style={{ padding: '10px 14px', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textAlign: 'center' }}>
            LOADING SCENE...
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(var(--accent-rgb), 0.08)' }}>
          {(['avatar', 'scene', 'shader', 'bot'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 0',
                background: tab === t ? 'rgba(var(--accent-rgb), 0.06)' : 'none',
                border: 'none',
                borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                color: tab === t ? 'var(--accent)' : 'var(--muted)',
                cursor: 'pointer', fontSize: 9, letterSpacing: 2,
                fontFamily: '"Courier New", monospace',
                transition: 'all 0.15s',
              }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="vea-panel-scroll" style={{ maxHeight: 360, overflowY: 'auto', padding: '14px' }}>

          {/* AVATAR TAB */}
          {tab === 'avatar' && (
            <>
              <PanelLabel>ACTIVE CHARACTER</PanelLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                {CHARACTERS.map(char => {
                  const active = activeCharacterId === char.id
                  return (
                    <button key={char.id} onClick={() => setActiveCharacterId(char.id)}
                      style={{
                        padding: '7px 10px', borderRadius: 3, cursor: 'pointer',
                        border: `1px solid ${active ? 'var(--accent)' : 'rgba(var(--accent-rgb), 0.12)'}`,
                        background: active ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--dim)',
                        fontSize: 10, fontFamily: '"Courier New", monospace', letterSpacing: 1,
                        textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.15s',
                        boxShadow: active ? '0 0 8px rgba(var(--accent-rgb), 0.15)' : 'none',
                      }}>
                      <span>{active ? '▶ ' : '· '}{char.name.toUpperCase()}</span>
                      <span style={{ opacity: 0.4, fontSize: 9 }}>{char.modelUrl ? char.type.toUpperCase() : 'AURA'}</span>
                    </button>
                  )
                })}
              </div>

              <Divider />
              <PanelLabel>COLOR CONFIG</PanelLabel>
              {(Object.entries(colors) as [keyof ColorConfig, string][]).map(([key, val]) => (
                <ColorRow key={key} label={key} value={val} onChange={v => setColors(c => ({ ...c, [key]: v }))} />
              ))}
            </>
          )}

          {/* SCENE TAB */}
          {tab === 'scene' && (
            <>
              <PanelLabel>SCENE SETTINGS</PanelLabel>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 5 }}>NAME</div>
                <CyberInput value={sceneName} onChange={setSceneName} placeholder="SCENE NAME" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 5 }}>ENVIRONMENT</div>
                <CyberSelect value={sceneEnv} options={ENVS} onChange={setSceneEnv} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 5 }}>BACKGROUND COLOR</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', width: 32, height: 28 }}>
                    <div style={{
                      width: 32, height: 28, borderRadius: 3,
                      background: bgColor, border: '1px solid rgba(var(--accent-rgb), 0.2)',
                      boxShadow: `0 0 8px ${bgColor}44`,
                    }} />
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: '"Courier New", monospace' }}>{bgColor.toUpperCase()}</span>
                </div>
              </div>

              <Divider />
              <CyberSlider label="AMBIENT LIGHT" value={ambientIntensity} min={0} max={2} step={0.05} onChange={setAmbientIntensity} />
            </>
          )}

          {/* SHADER TAB */}
          {tab === 'shader' && (
            <>
              <PanelLabel>ENERGY SHADER PARAMS</PanelLabel>
              <CyberSlider label="WIREFRAME OPACITY"  value={shaders.wireframeOpacity} min={0} max={1}   step={0.01} onChange={v => setShaders(s => ({ ...s, wireframeOpacity: v }))} />
              <CyberSlider label="GLOW INTENSITY"     value={shaders.glowIntensity}    min={0} max={3}   step={0.05} onChange={v => setShaders(s => ({ ...s, glowIntensity: v }))} />
              <CyberSlider label="PULSE SPEED"        value={shaders.pulseSpeed}       min={0} max={5}   step={0.1}  onChange={v => setShaders(s => ({ ...s, pulseSpeed: v }))} />
              <CyberSlider label="DISTORTION"         value={shaders.distortion}       min={0} max={1}   step={0.01} onChange={v => setShaders(s => ({ ...s, distortion: v }))} />

              {/* Live preview strip */}
              <Divider />
              <PanelLabel>PREVIEW</PanelLabel>
              <div style={{
                height: 40, borderRadius: 4,
                background: `linear-gradient(135deg, ${colors.primary}22, ${colors.glow}22)`,
                border: `1px solid ${colors.primary}44`,
                boxShadow: `0 0 ${shaders.glowIntensity * 14}px ${colors.glow}55`,
                transition: 'all 0.3s',
              }} />
            </>
          )}

          {/* BOT TAB */}
          {tab === 'bot' && (
            <>
              <PanelLabel>CLAWBOT CONFIG</PanelLabel>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.4 }}>
                Your API key lives only in your personal .env (LLM_API_KEY) and is added by your
                local server. It is never entered here, sent from this page, or stored anywhere.
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 5 }}>MODEL</div>
                <CyberSelect value={botModel} options={PRESET_MODELS} onChange={setBotModel} />
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(var(--accent-rgb), 0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {saveMsg ? (
            <span style={{ fontSize: 9, letterSpacing: 2, color: saveMsg.ok ? 'var(--accent2)' : 'var(--danger)' }}>
              {saveMsg.ok ? '✓' : '✗'} {saveMsg.text}
            </span>
          ) : (
            <span style={{ fontSize: 9, letterSpacing: 1, color: 'var(--line)' }}>
              ● SESSION ACTIVE
            </span>
          )}
          <SaveButton onClick={handleSave} disabled={saving} saving={saving} />
        </div>

        {/* bottom accent */}
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(var(--accent-rgb), 0.12), transparent)' }} />
      </div>
    </>
  )
}
