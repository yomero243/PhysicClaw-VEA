import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionUser } from '../types/multiplayer'
import { COMPACT, isCompactViewport, useCompactLayout } from '../hooks/useCompactLayout'

interface UserDiscoveryPanelProps {
    remoteUsers: SessionUser[]
    sceneId?: string | null
}

type PresenceNotice = {
    id: string
    label: string
    kind: 'join' | 'leave'
}

function shortUserId(userId: string): string {
    return userId.slice(0, 8).toUpperCase()
}

function avatarLabel(avatarId: string | null): string {
    if (!avatarId) return 'UNKNOWN'
    if (avatarId.startsWith('https://')) return 'CUSTOM GLB'
    return avatarId.replace(/-/g, ' ').toUpperCase()
}

function distanceFromOrigin(position: [number, number, number]): number {
    const [x, y, z] = position
    return Math.sqrt(x * x + y * y + z * z)
}

function lastSeenLabel(value: string): string {
    const time = new Date(value).getTime()
    if (Number.isNaN(time)) return 'LIVE'

    const seconds = Math.max(0, Math.round((Date.now() - time) / 1000))
    if (seconds < 10) return 'NOW'
    if (seconds < 60) return `${seconds}S`
    return `${Math.round(seconds / 60)}M`
}

export function UserDiscoveryPanel({ remoteUsers, sceneId }: UserDiscoveryPanelProps) {
    const compact = useCompactLayout()
    // Phones start collapsed: the panel would otherwise cover the entity.
    const [collapsed, setCollapsed] = useState(isCompactViewport)
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [copyStatus, setCopyStatus] = useState<string | null>(null)
    const [notice, setNotice] = useState<PresenceNotice | null>(null)
    const previousIdsRef = useRef<Set<string>>(new Set())

    const sortedUsers = useMemo(() => {
        return [...remoteUsers].sort((a, b) => {
            const aTime = new Date(a.joined_at).getTime()
            const bTime = new Date(b.joined_at).getTime()
            return bTime - aTime
        })
    }, [remoteUsers])

    const selectedUser = sortedUsers.find((user) => user.user_id === selectedUserId) ?? null
    const sceneLabel = sceneId ? sceneId.slice(0, 8).toUpperCase() : 'NO SCENE'

    useEffect(() => {
        const previousIds = previousIdsRef.current
        const nextIds = new Set(remoteUsers.map((user) => user.user_id))

        const joined = remoteUsers.find((user) => !previousIds.has(user.user_id))
        if (joined && previousIds.size > 0) {
            setNotice({
                id: joined.user_id,
                label: `${shortUserId(joined.user_id)} ENTERED RANGE`,
                kind: 'join',
            })
        }

        for (const userId of previousIds) {
            if (!nextIds.has(userId)) {
                setNotice({
                    id: userId,
                    label: `${shortUserId(userId)} LEFT RANGE`,
                    kind: 'leave',
                })
                if (selectedUserId === userId) setSelectedUserId(null)
                break
            }
        }

        previousIdsRef.current = nextIds
    }, [remoteUsers, selectedUserId])

    useEffect(() => {
        if (!notice) return
        const timeout = window.setTimeout(() => setNotice(null), 3200)
        return () => window.clearTimeout(timeout)
    }, [notice])

    useEffect(() => {
        if (!copyStatus) return
        const timeout = window.setTimeout(() => setCopyStatus(null), 1800)
        return () => window.clearTimeout(timeout)
    }, [copyStatus])

    const copyUserId = async (userId: string) => {
        try {
            await navigator.clipboard.writeText(userId)
            setCopyStatus('ID COPIED')
        } catch {
            setCopyStatus('COPY FAILED')
        }
    }

    return (
        <div
            style={{
                position: 'absolute',
                top: 84,
                right: 20,
                ...(compact ? { top: COMPACT.BELOW_TOP_ROW, right: COMPACT.EDGE, maxWidth: `calc(100vw - ${COMPACT.EDGE * 2}px)` } : {}),
                zIndex: 12,
                width: 'min(320px, calc(100vw - 40px))',
                fontFamily: '"Courier New", monospace',
                color: 'var(--text)',
                pointerEvents: 'auto',
            }}
        >
            {notice && (
                <div
                    style={{
                        marginBottom: 8,
                        padding: '8px 10px',
                        borderRadius: 4,
                        background: 'rgba(var(--panel-deep-rgb), 0.86)',
                        border: `1px solid ${notice.kind === 'join' ? 'rgba(var(--accent2-rgb), 0.35)' : 'rgba(255,190,80,0.35)'}`,
                        color: notice.kind === 'join' ? 'var(--accent2)' : '#F2B84B',
                        fontSize: 10,
                        letterSpacing: 1.2,
                        boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
                    }}
                >
                    {notice.label}
                </div>
            )}

            <div
                style={{
                    background: 'linear-gradient(180deg, rgba(var(--panel-rgb), 0.9), rgba(var(--panel-deep-rgb), 0.82))',
                    backdropFilter: 'blur(18px)',
                    border: '1px solid rgba(var(--accent-rgb), 0.18)',
                    borderRadius: 7,
                    overflow: 'hidden',
                    boxShadow: '0 18px 42px rgba(0,0,0,0.42), 0 0 22px rgba(var(--accent-rgb), 0.07)',
                }}
            >
                <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(var(--accent-rgb), 0.35), transparent)' }} />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 12px',
                    }}
                >
                    <button
                        onClick={() => setCollapsed((value) => !value)}
                        title={collapsed ? 'Expand discovery' : 'Collapse discovery'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: 0,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            fontFamily: '"Courier New", monospace',
                            minWidth: 0,
                        }}
                    >
                        <span
                            style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: remoteUsers.length > 0 ? 'var(--accent2)' : 'var(--muted)',
                                boxShadow: remoteUsers.length > 0 ? '0 0 8px var(--accent2)' : 'none',
                                flexShrink: 0,
                            }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
                            DISCOVERY
                        </span>
                        <span style={{ color: 'rgba(var(--accent-rgb), 0.35)', fontSize: 10 }}>
                            {collapsed ? 'SHOW' : 'HIDE'}
                        </span>
                    </button>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexShrink: 0,
                        }}
                    >
                        <span
                            style={{
                                padding: '3px 7px',
                                borderRadius: 3,
                                border: '1px solid rgba(var(--accent-rgb), 0.16)',
                                color: remoteUsers.length > 0 ? 'var(--accent2)' : 'var(--dim)',
                                fontSize: 9,
                                letterSpacing: 1.2,
                            }}
                        >
                            {remoteUsers.length} USERS
                        </span>
                    </div>
                </div>

                {!collapsed && (
                    <>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0 12px 9px',
                                color: 'var(--dim)',
                                fontSize: 9,
                                letterSpacing: 1.2,
                                borderBottom: '1px solid rgba(var(--accent-rgb), 0.08)',
                            }}
                        >
                            <span>SCENE::{sceneLabel}</span>
                            <span>{copyStatus ?? 'AUTO SCAN'}</span>
                        </div>

                        {sortedUsers.length === 0 ? (
                            <div
                                style={{
                                    padding: '16px 12px',
                                    color: 'var(--dim)',
                                    fontSize: 10,
                                    lineHeight: 1.5,
                                    letterSpacing: 1,
                                }}
                            >
                                NO REMOTE USERS DETECTED
                            </div>
                        ) : (
                            <div
                                style={{
                                    maxHeight: 260,
                                    overflowY: 'auto',
                                }}
                            >
                                {sortedUsers.map((user) => {
                                    const selected = user.user_id === selectedUserId
                                    const distance = distanceFromOrigin(user.position)

                                    return (
                                        <button
                                            key={user.user_id}
                                            onClick={() => setSelectedUserId(selected ? null : user.user_id)}
                                            style={{
                                                width: '100%',
                                                display: 'grid',
                                                gridTemplateColumns: '1fr auto',
                                                gap: 10,
                                                padding: '10px 12px',
                                                background: selected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                                border: 'none',
                                                borderBottom: '1px solid rgba(var(--accent-rgb), 0.06)',
                                                color: 'var(--text)',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                fontFamily: '"Courier New", monospace',
                                            }}
                                        >
                                            <span style={{ minWidth: 0 }}>
                                                <span
                                                    style={{
                                                        display: 'block',
                                                        color: selected ? 'var(--accent)' : 'var(--text)',
                                                        fontSize: 11,
                                                        letterSpacing: 1.4,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    USER::{shortUserId(user.user_id)}
                                                </span>
                                                <span
                                                    style={{
                                                        display: 'block',
                                                        marginTop: 4,
                                                        color: 'var(--dim)',
                                                        fontSize: 9,
                                                        letterSpacing: 1,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {avatarLabel(user.avatar_id)}
                                                </span>
                                            </span>

                                            <span
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-end',
                                                    gap: 4,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <span style={{ color: 'var(--accent2)', fontSize: 10, letterSpacing: 1 }}>
                                                    {distance.toFixed(1)}M
                                                </span>
                                                <span style={{ color: 'var(--dim)', fontSize: 9, letterSpacing: 1 }}>
                                                    {lastSeenLabel(user.last_seen_at)}
                                                </span>
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {selectedUser && (
                            <div
                                style={{
                                    padding: 12,
                                    borderTop: '1px solid rgba(var(--accent-rgb), 0.08)',
                                    display: 'grid',
                                    gap: 9,
                                }}
                            >
                                <div
                                    style={{
                                        color: 'var(--dim)',
                                        fontSize: 9,
                                        lineHeight: 1.5,
                                        letterSpacing: 1,
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    FULL ID::{selectedUser.user_id}
                                </div>

                                <button
                                    onClick={() => copyUserId(selectedUser.user_id)}
                                    style={{
                                        height: 34,
                                        borderRadius: 4,
                                        border: '1px solid rgba(var(--accent-rgb), 0.28)',
                                        background: 'rgba(var(--accent-rgb), 0.08)',
                                        color: 'var(--accent)',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: 1.4,
                                        fontFamily: '"Courier New", monospace',
                                        cursor: 'pointer',
                                    }}
                                >
                                    COPY USER ID
                                </button>
                            </div>
                        )}

                        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(var(--accent-rgb), 0.12), transparent)' }} />
                    </>
                )}
            </div>
        </div>
    )
}
