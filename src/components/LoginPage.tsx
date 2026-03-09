import { useState, FormEvent, useEffect, useRef } from 'react'
import { useAuth } from '../auth'

/* ─── Animated background canvas ─── */
function GridCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    let t = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const { width: W, height: H } = canvas
      ctx.clearRect(0, 0, W, H)

      // Deep background
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8)
      bg.addColorStop(0, '#050d1a')
      bg.addColorStop(1, '#020609')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Grid lines
      const STEP = 60
      ctx.strokeStyle = 'rgba(0,180,255,0.06)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += STEP) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += STEP) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Scan line
      const scanY = (H * ((t * 0.4) % 1))
      const scanGrad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 60)
      scanGrad.addColorStop(0, 'rgba(0,212,255,0)')
      scanGrad.addColorStop(0.5, 'rgba(0,212,255,0.04)')
      scanGrad.addColorStop(1, 'rgba(0,212,255,0)')
      ctx.fillStyle = scanGrad
      ctx.fillRect(0, scanY - 60, W, 120)

      // Floating nodes
      const nodes = 8
      for (let i = 0; i < nodes; i++) {
        const angle = (i / nodes) * Math.PI * 2 + t * 0.1
        const r = Math.min(W, H) * 0.35
        const nx = W / 2 + Math.cos(angle) * r
        const ny = H / 2 + Math.sin(angle) * r * 0.4
        const pulse = 0.4 + 0.6 * Math.sin(t * 1.5 + i)
        ctx.beginPath()
        ctx.arc(nx, ny, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,255,${pulse * 0.5})`
        ctx.fill()
        // line to center
        ctx.beginPath()
        ctx.moveTo(nx, ny)
        ctx.lineTo(W / 2, H / 2)
        ctx.strokeStyle = `rgba(0,212,255,${pulse * 0.06})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      t += 0.008
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
}

/* ─── Shared input component ─── */
function CyberInput({
  type, placeholder, value, onChange, minLength, required,
}: {
  type: string; placeholder: string; value: string
  onChange: (v: string) => void; minLength?: number; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '12px 14px',
          background: 'rgba(0,20,40,0.6)',
          border: `1px solid ${focused ? '#00d4ff' : 'rgba(0,180,255,0.2)'}`,
          borderRadius: 4,
          color: '#e2f0ff',
          fontSize: 14,
          fontFamily: '"Courier New", monospace',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s',
          boxShadow: focused ? '0 0 12px rgba(0,212,255,0.2)' : 'none',
        }}
      />
      {/* corner accents */}
      <span style={{
        position: 'absolute', top: -1, left: -1,
        width: 8, height: 8,
        borderTop: `2px solid ${focused ? '#00d4ff' : 'rgba(0,212,255,0.4)'}`,
        borderLeft: `2px solid ${focused ? '#00d4ff' : 'rgba(0,212,255,0.4)'}`,
        transition: 'border-color 0.2s',
      }} />
      <span style={{
        position: 'absolute', bottom: -1, right: -1,
        width: 8, height: 8,
        borderBottom: `2px solid ${focused ? '#00d4ff' : 'rgba(0,212,255,0.4)'}`,
        borderRight: `2px solid ${focused ? '#00d4ff' : 'rgba(0,212,255,0.4)'}`,
        transition: 'border-color 0.2s',
      }} />
    </div>
  )
}

/* ─── Login view ─── */
function LoginView({ onSwitch }: { onSwitch: () => void }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } catch {
      setError('Unexpected error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <Logo />
      <div style={labelStyle}>AUTHENTICATION REQUIRED</div>
      <Divider />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CyberInput type="email" placeholder="user@domain.com" value={email} onChange={setEmail} required />
        <CyberInput type="password" placeholder="Password" value={password} onChange={setPassword} minLength={6} required />
      </div>

      {error && <ErrorBadge msg={error} />}

      <SubmitButton submitting={submitting} label="AUTHENTICATE" />

      <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#4a6a8a', fontSize: 12 }}>No credentials? </span>
        <button type="button" onClick={onSwitch} style={linkBtn}>
          REQUEST ACCESS
        </button>
      </div>
    </form>
  )
}

/* ─── Register view ─── */
function RegisterView({ onSwitch }: { onSwitch: () => void }) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSubmitting(true)
    try {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else setSuccess(true)
    } catch {
      setError('Unexpected error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ ...formStyle, alignItems: 'center', textAlign: 'center', gap: 24 }}>
        <Logo />
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          border: '2px solid #00d4ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(0,212,255,0.4)',
          fontSize: 28,
        }}>✓</div>
        <div>
          <div style={{ color: '#00d4ff', fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
            ACCESS GRANTED
          </div>
          <div style={{ color: '#4a6a8a', fontSize: 12, lineHeight: 1.6 }}>
            Check your email to confirm your account,<br />then sign in.
          </div>
        </div>
        <button type="button" onClick={onSwitch} style={{ ...linkBtn, fontSize: 13 }}>
          ← BACK TO LOGIN
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <Logo />
      <div style={labelStyle}>CREATE ACCOUNT</div>
      <Divider />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CyberInput type="email" placeholder="user@domain.com" value={email} onChange={setEmail} required />
        <CyberInput type="password" placeholder="Password (min. 6 chars)" value={password} onChange={setPassword} minLength={6} required />
        <CyberInput type="password" placeholder="Confirm password" value={confirm} onChange={setConfirm} minLength={6} required />
      </div>

      {error && <ErrorBadge msg={error} />}

      <SubmitButton submitting={submitting} label="CREATE ACCOUNT" />

      <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#4a6a8a', fontSize: 12 }}>Already have access? </span>
        <button type="button" onClick={onSwitch} style={linkBtn}>
          SIGN IN
        </button>
      </div>
    </form>
  )
}

/* ─── Sub-components ─── */
function Logo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 4 }}>
      <div style={{
        fontSize: 28, fontWeight: 900, letterSpacing: 4, color: '#00d4ff',
        textShadow: '0 0 20px rgba(0,212,255,0.6), 0 0 40px rgba(0,212,255,0.2)',
        fontFamily: '"Courier New", monospace',
      }}>
        PHYSIC<span style={{ color: '#fff' }}>CLAW</span>
      </div>
      <div style={{ fontSize: 10, color: '#2a5a7a', letterSpacing: 6, marginTop: 2 }}>
        VEA · SYSTEM
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(0,212,255,0.3))' }} />
      <div style={{ width: 4, height: 4, background: '#00d4ff', transform: 'rotate(45deg)', opacity: 0.6 }} />
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(0,212,255,0.3))' }} />
    </div>
  )
}

function ErrorBadge({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '8px 12px',
      background: 'rgba(255,50,50,0.1)',
      border: '1px solid rgba(255,80,80,0.3)',
      borderRadius: 4,
      color: '#ff6060',
      fontSize: 12,
      fontFamily: '"Courier New", monospace',
    }}>
      ⚠ {msg}
    </div>
  )
}

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      style={{
        padding: '12px 0',
        background: submitting
          ? 'rgba(0,100,140,0.4)'
          : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.05))',
        color: submitting ? '#4a8aa0' : '#00d4ff',
        border: `1px solid ${submitting ? 'rgba(0,212,255,0.2)' : '#00d4ff'}`,
        borderRadius: 4,
        fontSize: 13,
        fontFamily: '"Courier New", monospace',
        fontWeight: 700,
        letterSpacing: 3,
        cursor: submitting ? 'wait' : 'pointer',
        transition: 'all 0.2s',
        boxShadow: submitting ? 'none' : '0 0 16px rgba(0,212,255,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {submitting ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Spinner /> PROCESSING...
        </span>
      ) : label}
    </button>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 12,
      height: 12,
      border: '2px solid rgba(0,212,255,0.2)',
      borderTopColor: '#00d4ff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

/* ─── Main export ─── */
export function LoginPage() {
  const [view, setView] = useState<'login' | 'register'>('login')

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: '"Courier New", monospace' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder { color: rgba(100,160,200,0.4); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #050d1a inset !important;
          -webkit-text-fill-color: #e2f0ff !important;
        }
      `}</style>

      {/* Animated background */}
      <GridCanvas />

      {/* Center card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
          background: 'rgba(4,12,24,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 8,
          boxShadow: '0 0 60px rgba(0,212,255,0.08), 0 24px 60px rgba(0,0,0,0.6)',
          position: 'relative',
          animation: 'fadeIn 0.4s ease',
        }}>
          {/* top accent bar */}
          <div style={{
            height: 2,
            background: 'linear-gradient(to right, transparent, #00d4ff, transparent)',
            borderRadius: '8px 8px 0 0',
          }} />

          {/* corner ornaments */}
          {[
            { top: 8, left: 8, bt: '2px solid #00d4ff', bl: '2px solid #00d4ff', br: 'none', bb: 'none' },
            { top: 8, right: 8, bt: '2px solid #00d4ff', br: '2px solid #00d4ff', bl: 'none', bb: 'none' },
            { bottom: 8, left: 8, bb: '2px solid rgba(0,212,255,0.4)', bl: '2px solid rgba(0,212,255,0.4)', bt: 'none', br: 'none' },
            { bottom: 8, right: 8, bb: '2px solid rgba(0,212,255,0.4)', br: '2px solid rgba(0,212,255,0.4)', bt: 'none', bl: 'none' },
          ].map((s, i) => (
            <span key={i} style={{
              position: 'absolute', width: 12, height: 12,
              ...s as React.CSSProperties,
            }} />
          ))}

          <div style={{ padding: '32px 36px 28px' }}>
            {view === 'login'
              ? <LoginView onSwitch={() => setView('register')} />
              : <RegisterView onSwitch={() => setView('login')} />
            }
          </div>

          {/* bottom accent */}
          <div style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, rgba(0,212,255,0.15), transparent)',
            borderRadius: '0 0 8px 8px',
          }} />
        </div>
      </div>
    </div>
  )
}

/* ─── Styles ─── */
const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
}

const labelStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 10,
  letterSpacing: 4,
  color: '#2a7a9a',
  marginTop: -8,
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#00d4ff',
  fontSize: 12,
  fontFamily: '"Courier New", monospace',
  cursor: 'pointer',
  letterSpacing: 1,
  textDecoration: 'none',
  opacity: 0.85,
}
