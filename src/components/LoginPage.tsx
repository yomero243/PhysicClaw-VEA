import { useState, FormEvent } from 'react'
import { useAuth } from '../auth'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error } = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password)
      if (error) setError(error.message)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#030810',
      fontFamily: '"Courier New", monospace',
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 360,
        padding: 32,
        background: '#0a1020',
        border: '1px solid #1a2a40',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 24,
          color: '#00d4ff',
          textAlign: 'center',
          letterSpacing: 2,
        }}>
          PhysicClaw
        </h1>
        <p style={{
          margin: 0,
          fontSize: 12,
          color: '#6b7a90',
          textAlign: 'center',
        }}>
          {mode === 'signin' ? 'Sign in to continue' : 'Create a new account'}
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: '#ff4444' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '10px 0',
            background: submitting ? '#0a3a50' : '#00d4ff',
            color: '#030810',
            border: 'none',
            borderRadius: 4,
            fontSize: 14,
            fontFamily: 'inherit',
            fontWeight: 700,
            cursor: submitting ? 'wait' : 'pointer',
            letterSpacing: 1,
          }}
        >
          {submitting ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7a90',
            fontSize: 12,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: '#0d1525',
  border: '1px solid #1a2a40',
  borderRadius: 4,
  color: '#e2e8f0',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
}
