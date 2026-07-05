// ============================================================
// PhysicClaw-VEA — AgentTokenPanel
// Manage per-user agent tokens for the production control API.
// The plaintext secret is displayed exactly once after creation.
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { agentTokensApi, type AgentToken } from '../lib/agentTokens'
import { useSoulStore } from '../store/soulStore'

const MONO = '"Courier New", monospace'

export function AgentTokenPanel() {
    const userId = useSoulStore((s) => s.userId)
    const [open, setOpen] = useState(false)
    const [tokens, setTokens] = useState<AgentToken[]>([])
    const [name, setName] = useState('')
    const [freshSecret, setFreshSecret] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const refresh = useCallback(async () => {
        if (!userId) return
        try {
            setTokens(await agentTokensApi.list(userId))
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        }
    }, [userId])

    useEffect(() => {
        if (open) void refresh()
    }, [open, refresh])

    const handleCreate = async () => {
        if (!userId || !name.trim() || busy) return
        setBusy(true)
        setError(null)
        try {
            const { secret } = await agentTokensApi.create(userId, name.trim())
            setFreshSecret(secret)
            setName('')
            await refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    const handleRevoke = async (id: string) => {
        setError(null)
        try {
            await agentTokensApi.revoke(id)
            await refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        }
    }

    if (!userId) return null

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                style={{
                    position: 'absolute', bottom: 16, left: 16, zIndex: 20,
                    background: 'rgba(10,11,10,0.85)', color: '#8CFFB0',
                    border: '1px solid rgba(140,255,176,0.25)', borderRadius: 4,
                    padding: '6px 12px', fontFamily: MONO, fontSize: 10,
                    letterSpacing: 2, cursor: 'pointer',
                }}
            >
                ⌁ AGENT TOKENS
            </button>
        )
    }

    return (
        <div
            style={{
                position: 'absolute', bottom: 16, left: 16, zIndex: 20,
                width: 320, maxHeight: '60vh', overflowY: 'auto',
                background: 'rgba(10,11,10,0.92)', color: '#A9B89A',
                border: '1px solid rgba(140,255,176,0.25)', borderRadius: 6,
                padding: 14, fontFamily: MONO,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(140,255,176,0.5)' }}>
                    AGENT TOKENS
                </span>
                <button
                    onClick={() => { setOpen(false); setFreshSecret(null) }}
                    aria-label="Close agent tokens panel"
                    style={{ background: 'none', border: 'none', color: '#8CFFB0', cursor: 'pointer', fontSize: 12 }}
                >
                    ✕
                </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="token name (e.g. dr_botcin)"
                    maxLength={60}
                    style={{
                        flex: 1, background: 'rgba(140,255,176,0.06)', color: '#8CFFB0',
                        border: '1px solid rgba(140,255,176,0.2)', borderRadius: 3,
                        padding: '5px 8px', fontFamily: MONO, fontSize: 11,
                    }}
                />
                <button
                    onClick={() => { void handleCreate() }}
                    disabled={busy || !name.trim()}
                    style={{
                        background: 'rgba(140,255,176,0.12)', color: '#8CFFB0',
                        border: '1px solid rgba(140,255,176,0.3)', borderRadius: 3,
                        padding: '5px 10px', fontFamily: MONO, fontSize: 11,
                        cursor: busy || !name.trim() ? 'default' : 'pointer',
                        opacity: busy || !name.trim() ? 0.4 : 1,
                    }}
                >
                    CREATE
                </button>
            </div>

            {freshSecret && (
                <div
                    style={{
                        border: '1px solid rgba(255,204,0,0.4)', borderRadius: 4,
                        padding: 8, marginBottom: 12, background: 'rgba(255,204,0,0.05)',
                    }}
                >
                    <div style={{ fontSize: 9, color: '#ffcc00', marginBottom: 6, letterSpacing: 1 }}>
                        COPY NOW — SHOWN ONLY ONCE
                    </div>
                    <code style={{ fontSize: 10, wordBreak: 'break-all', color: '#8CFFB0' }}>
                        {freshSecret}
                    </code>
                    <button
                        onClick={() => { void navigator.clipboard.writeText(freshSecret) }}
                        style={{
                            display: 'block', marginTop: 6, background: 'none',
                            border: '1px solid rgba(140,255,176,0.3)', borderRadius: 3,
                            color: '#8CFFB0', fontFamily: MONO, fontSize: 10,
                            padding: '3px 8px', cursor: 'pointer',
                        }}
                    >
                        COPY
                    </button>
                </div>
            )}

            {error && (
                <div style={{ fontSize: 10, color: '#ff4444', marginBottom: 10 }}>{error}</div>
            )}

            {tokens.map((t) => (
                <div
                    key={t.id}
                    style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 0', borderBottom: '1px solid rgba(140,255,176,0.08)',
                        opacity: t.revoked ? 0.4 : 1,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 11, color: '#8CFFB0' }}>{t.name}</div>
                        <div style={{ fontSize: 9 }}>
                            {t.revoked
                                ? 'revoked'
                                : t.last_used_at
                                    ? `last used ${new Date(t.last_used_at).toLocaleString()}`
                                    : 'never used'}
                        </div>
                    </div>
                    {!t.revoked && (
                        <button
                            onClick={() => { void handleRevoke(t.id) }}
                            style={{
                                background: 'none', border: '1px solid rgba(255,68,68,0.4)',
                                borderRadius: 3, color: '#ff4444', fontFamily: MONO,
                                fontSize: 9, padding: '3px 8px', cursor: 'pointer',
                            }}
                        >
                            REVOKE
                        </button>
                    )}
                </div>
            ))}
            {tokens.length === 0 && (
                <div style={{ fontSize: 10, opacity: 0.6 }}>No tokens yet.</div>
            )}
        </div>
    )
}
