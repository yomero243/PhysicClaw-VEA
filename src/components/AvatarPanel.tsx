// ============================================================
// PhysicClaw-VEA — AvatarPanel (Cyber Redesign)
// ============================================================
import { useState, useEffect } from 'react'
import { useScenePersistence } from '../hooks/useScenePersistence'
import { CHARACTERS } from '../constants/characters'
import { useSoulStore } from '../store/soulStore'

interface ColorConfig {
  primary: string; secondary: string; glow: string; emission: string
}
interface ShaderConfig {
  wireframeOpacity: number; glowIntensity: number; pulseSpeed: number; distortion: number
  [key: string]: unknown
}

const DEFAULT_COLORS: ColorConfig = { primary: '#00ccff', secondary: '#7700ff', glow: '#00ffcc', emission: '#ffffff' }
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

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(0,212,255,0.4)', marginBottom: 10, fontFamily: '"Courier New", monospace' }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(0,212,255,0.15), transparent)', margin: '14px 0' }} />
}

function CyberSlider({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: '#4a7a9a', fontFamily: '"Courier New", monospace' }}>{label}</span>
        <span style={{ fontSize: 10, color: '#00d4ff', fontFamily: '"Courier New", monospace' }}>{value.toFixed(2)}</span>
      </div>
      <div style={{ position: 'relative', height: 3, background: 'rgba(0,212,255,0.1)', borderRadius: 2 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
          width: `${((value - min) / (max - min)) * 100}%`,
          background: 'linear-gradient(to right, rgba(0,212,255,0.4), #00d4ff)',
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
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 3,
          background: value,
          border: '1px solid rgba(0,212,255,0.2)',
          boxShadow: `0 0 8px ${value}44`,
        }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', border: 'none', padding: 0 }}
        />
      </div>
      <span style={{ flex: 1, fontSize: 11, color: '#4a7a9a', fontFamily: '"Courier New", monospace', textTransform: 'capitalize' }}>{label}</span>
      <span style={{ fontSize: 10, color: '#2a5a7a', fontFamily: '"Courier New", monospace' }}>{value.toUpperCase()}</span>
    </div>
  )
}

function CyberSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px',
          background: 'rgba(0,10,24,0.6)',
          border: '1px solid rgba(0,180,255,0.15)',
          borderRadius: 4, color: '#c8e8ff',
          fontSize: 11, fontFamily: '"Courier New", monospace',
          outline: 'none', cursor: 'pointer',
          appearance: 'none',
        }}>
        {options.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,212,255,0.4)', pointerEvents: 'none', fontSize: 10 }}>▾</span>
    </div>
  )
}

function CyberInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '8px 12px', boxSizing: 'border-box',
        background: 'rgba(0,10,24,0.6)',
        border: `1px solid ${focused ? 'rgba(0,212,255,0.45)' : 'rgba(0,180,255,0.15)'}`,
        borderRadius: 4, color: '#c8e8ff',
        fontSize: 11, fontFamily: '"Courier New", monospace',
        outline: 'none', transition: 'border-color 0.2s',
      }}
    />
  )
}

function SaveButton({ onClick, disabled, saving }: { onClick: () => void; disabled: boolean; saving: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '8px 20px', borderRadius: 4,
        border: `1px solid ${disabled ? 'rgba(0,212,255,0.1)' : '#00d4ff'}`,
        background: disabled ? 'transparent' : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.05))',
        color: disabled ? '#2a5a7a' : '#00d4ff',
        fontSize: 10, fontFamily: '"Courier New", monospace', fontWeight: 700, letterSpacing: 2,
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
        boxShadow: disabled ? 'none' : '0 0 10px rgba(0,212,255,0.15)',
      }}>
      {saving ? 'SAVING...' : 'SAVE'}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────
export const AvatarPanel = () => {
  const {
    isAuthenticated, currentScene, avatarConfig, isLoadingScene, error,
    saveSceneSettings, saveAvatarConfig, clearError,
  } = useScenePersistence()

  // Selectores granulares para evitar re-renders de todo el panel
  const activeCharacterId = useSoulStore(s => s.activeCharacterId)
  const setActiveCharacterId = useSoulStore(s => s.setActiveCharacterId)
  const mood = useSoulStore(s => s.mood)
  const intensity = useSoulStore(s => s.intensity)
  const apiBaseUrl = useSoulStore(s => s.apiBaseUrl)
  const apiToken = useSoulStore(s => s.apiToken)
  const apiModel = useSoulStore(s => s.apiModel)
  const setApiConfig = useSoulStore(s => s.setApiConfig)

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('avatar')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Bot states
  const [botUrl, setBotUrl] = useState(apiBaseUrl)
  const [botToken, setBotToken] = useState(apiToken)
  const [botModel, setBotModel] = useState(apiModel)
  const [testing, setTesting] = useState(false)

  const [colors, setColors] = useState<ColorConfig>(DEFAULT_COLORS)
  const [shaders, setShaders] = useState<ShaderConfig>(DEFAULT_SHADERS)
  const [sceneName, setSceneName] = useState('')
  const [sceneEnv, setSceneEnv] = useState('city')
  const [bgColor, setBgColor] = useState('#111111')
  const [ambientIntensity, setAmbientIntensity] = useState(0.5)

  useEffect(() => {
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

  useEffect(() => {
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
        setApiConfig({ apiBaseUrl: botUrl, apiToken: botToken, apiModel: botModel })
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
          background: 'rgba(2,8,18,0.75)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,212,255,0.25)',
          color: '#00d4ff', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(0,212,255,0.1)',
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
        .vea-panel-scroll::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.2); border-radius: 2px; }
        select option { background: #030810; color: #c8e8ff; }
      `}</style>

      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 20,
        width: 300,
        background: 'rgba(2,8,18,0.90)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,212,255,0.18)',
        borderRadius: 6,
        boxShadow: '0 0 40px rgba(0,212,255,0.06), 0 16px 40px rgba(0,0,0,0.5)',
        fontFamily: '"Courier New", monospace',
        overflow: 'hidden',
      }}>

        {/* top accent bar */}
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #00d4ff, transparent)' }} />

        {/* corner ornaments */}
        {[
          { top: 5, left: 5, borderTop: '1px solid #00d4ff', borderLeft: '1px solid #00d4ff' },
          { top: 5, right: 5, borderTop: '1px solid #00d4ff', borderRight: '1px solid #00d4ff' },
          { bottom: 5, left: 5, borderBottom: '1px solid rgba(0,212,255,0.3)', borderLeft: '1px solid rgba(0,212,255,0.3)' },
          { bottom: 5, right: 5, borderBottom: '1px solid rgba(0,212,255,0.3)', borderRight: '1px solid rgba(0,212,255,0.3)' },
        ].map((s, i) => (
          <span key={i} style={{ position: 'absolute', width: 10, height: 10, ...s as React.CSSProperties }} />
        ))}

        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(0,212,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: 3, color: '#00d4ff', fontWeight: 700 }}>
              VEA<span style={{ color: 'rgba(0,212,255,0.3)' }}>::PANEL</span>
            </span>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: '#2a5a7a', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* ── Status bar ── */}
        <div style={{
          padding: '6px 14px',
          display: 'flex', gap: 14, alignItems: 'center',
          borderBottom: '1px solid rgba(0,212,255,0.06)',
          fontSize: 9, letterSpacing: 2,
        }}>
          <span style={{ color: '#2a6a8a' }}>MOOD <span style={{ color: '#00d4ff' }}>{mood.toUpperCase()}</span></span>
          <span style={{ color: '#2a6a8a' }}>INT <span style={{ color: '#00d4ff' }}>{intensity.toFixed(2)}</span></span>
          {currentScene && (
            <span style={{ marginLeft: 'auto', color: '#1a4a6a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
              {currentScene.name.toUpperCase()}
            </span>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            padding: '7px 14px', fontSize: 10, letterSpacing: 1,
            background: 'rgba(255,50,50,0.08)', borderBottom: '1px solid rgba(255,80,80,0.2)',
            color: '#ff6060', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>⚠ {error}</span>
            <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#ff6060', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
        )}

        {/* ── Loading ── */}
        {isLoadingScene && (
          <div style={{ padding: '10px 14px', fontSize: 10, letterSpacing: 2, color: '#2a6a8a', textAlign: 'center' }}>
            LOADING SCENE...
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
          {(['avatar', 'scene', 'shader', 'bot'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 0',
                background: tab === t ? 'rgba(0,212,255,0.06)' : 'none',
                border: 'none',
                borderBottom: `2px solid ${tab === t ? '#00d4ff' : 'transparent'}`,
                color: tab === t ? '#00d4ff' : '#2a5a7a',
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
                        border: `1px solid ${active ? '#00d4ff' : 'rgba(0,180,255,0.12)'}`,
                        background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
                        color: active ? '#00d4ff' : '#4a7a9a',
                        fontSize: 10, fontFamily: '"Courier New", monospace', letterSpacing: 1,
                        textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.15s',
                        boxShadow: active ? '0 0 8px rgba(0,212,255,0.15)' : 'none',
                      }}>
                      <span>{active ? '▶ ' : '· '}{char.name.toUpperCase()}</span>
                      <span style={{ opacity: 0.4, fontSize: 9 }}>{char.type.toUpperCase()}</span>
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
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#2a6a8a', marginBottom: 5 }}>NAME</div>
                <CyberInput value={sceneName} onChange={setSceneName} placeholder="SCENE NAME" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#2a6a8a', marginBottom: 5 }}>ENVIRONMENT</div>
                <CyberSelect value={sceneEnv} options={ENVS} onChange={setSceneEnv} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#2a6a8a', marginBottom: 5 }}>BACKGROUND COLOR</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', width: 32, height: 28 }}>
                    <div style={{
                      width: 32, height: 28, borderRadius: 3,
                      background: bgColor, border: '1px solid rgba(0,212,255,0.2)',
                      boxShadow: `0 0 8px ${bgColor}44`,
                    }} />
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#2a5a7a', fontFamily: '"Courier New", monospace' }}>{bgColor.toUpperCase()}</span>
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
              <div style={{ fontSize: 10, color: '#2a6a8a', marginBottom: 12, lineHeight: 1.4 }}>
                Route conversations through our secure server or use your own API key.
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#2a6a8a', marginBottom: 5 }}>API BASE URL</div>
                <CyberInput value={botUrl} onChange={setBotUrl} placeholder="https://api.openclaw.ai" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#2a6a8a', marginBottom: 5 }}>API TOKEN (OPTIONAL)</div>
                <CyberInput value={botToken} onChange={setBotToken} placeholder="Your API key" />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#2a6a8a', marginBottom: 5 }}>MODEL</div>
                <CyberSelect value={botModel} options={PRESET_MODELS} onChange={setBotModel} />
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(0,212,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {saveMsg ? (
            <span style={{ fontSize: 9, letterSpacing: 2, color: saveMsg.ok ? '#00ff88' : '#ff6060' }}>
              {saveMsg.ok ? '✓' : '✗'} {saveMsg.text}
            </span>
          ) : (
            <span style={{ fontSize: 9, letterSpacing: 1, color: '#1a4a6a' }}>
              ● SESSION ACTIVE
            </span>
          )}
          <SaveButton onClick={handleSave} disabled={saving} saving={saving} />
        </div>

        {/* bottom accent */}
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(0,212,255,0.12), transparent)' }} />
      </div>
    </>
  )
}
