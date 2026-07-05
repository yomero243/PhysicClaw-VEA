import type { CSSProperties } from 'react'

interface InterfaceChromeProps {
    sceneName?: string | null
    sceneId?: string | null
    remoteCount: number
    lowPerformanceMode: boolean
    onTogglePerformance: () => void
}

const chipStyle: CSSProperties = {
    height: 26,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '0 12px',
    borderRadius: 999,
    border: '1px solid rgba(167,139,250, 0.16)',
    background: 'rgba(19,15,28, 0.64)',
    color: 'rgba(226, 217, 255, 0.78)',
    fontSize: 10,
    letterSpacing: 1.1,
    whiteSpace: 'nowrap',
}

function StatusDot({ color }: { color: string }) {
    return (
        <span
            style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 10px ${color}`,
                flexShrink: 0,
            }}
        />
    )
}

export function InterfaceChrome({
    sceneName,
    sceneId,
    remoteCount,
    lowPerformanceMode,
    onTogglePerformance,
}: InterfaceChromeProps) {
    const sceneLabel = sceneName?.trim() || (sceneId ? `SCENE ${sceneId.slice(0, 8).toUpperCase()}` : 'INITIALIZING')

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 8,
                pointerEvents: 'none',
                overflow: 'hidden',
                fontFamily: '"JetBrains Mono", "Courier New", monospace',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: [
                        'radial-gradient(circle at 50% 42%, transparent 0%, transparent 46%, rgba(0,0,0,0.38) 100%)',
                        'linear-gradient(to bottom, rgba(19,15,28,0.22), transparent 18%, transparent 72%, rgba(12,9,18,0.5))',
                    ].join(','),
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.09,
                    backgroundImage: 'linear-gradient(rgba(167,139,250,0.7) 1px, transparent 1px)',
                    backgroundSize: '100% 42px',
                    mixBlendMode: 'screen',
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    top: 18,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(720px, calc(100vw - 420px))',
                    minWidth: 'min(420px, calc(100vw - 40px))',
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 10px 8px 16px',
                    borderRadius: 16,
                    border: '1px solid rgba(167,139,250, 0.18)',
                    background: 'linear-gradient(180deg, rgba(19,15,28,0.78), rgba(12,9,18,0.62))',
                    boxShadow: '0 18px 42px rgba(0,0,0,0.32), 0 0 24px rgba(167,139,250,0.08)',
                    backdropFilter: 'blur(18px)',
                    pointerEvents: 'auto',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            color: '#F4F1FF',
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: 2.4,
                        }}
                    >
                        <StatusDot color="#A78BFA" />
                        PHYSICCLAW VEA
                    </div>
                    <div
                        style={{
                            marginTop: 4,
                            color: 'rgba(166,160,195,0.68)',
                            fontSize: 9,
                            letterSpacing: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {sceneLabel.toUpperCase()}
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 8,
                        flexShrink: 0,
                    }}
                >
                    <span style={chipStyle}>
                        <StatusDot color="#F0ABFC" />
                        CORE ON
                    </span>
                    <span style={chipStyle}>
                        <StatusDot color={remoteCount > 0 ? '#F0ABFC' : '#4E4766'} />
                        {remoteCount} ONLINE
                    </span>
                    <button
                        onClick={onTogglePerformance}
                        title={lowPerformanceMode ? 'Activar modo visual completo' : 'Activar modo optimizado'}
                        style={{
                            ...chipStyle,
                            color: lowPerformanceMode ? '#A6A0C3' : '#A78BFA',
                            border: `1px solid ${lowPerformanceMode ? 'rgba(167,139,250, 0.14)' : 'rgba(167,139,250,0.34)'}`,
                            cursor: 'pointer',
                            fontFamily: '"JetBrains Mono", "Courier New", monospace',
                            boxShadow: lowPerformanceMode ? 'none' : '0 0 18px rgba(167,139,250,0.12)',
                        }}
                    >
                        PERF {lowPerformanceMode ? 'ECO' : 'ULTRA'}
                    </button>
                </div>
            </div>

            {[
                { top: 18, left: 18, borderTop: '1px solid rgba(167,139,250,0.34)', borderLeft: '1px solid rgba(167,139,250,0.34)' },
                { top: 18, right: 18, borderTop: '1px solid rgba(167,139,250,0.34)', borderRight: '1px solid rgba(167,139,250,0.34)' },
                { bottom: 18, left: 18, borderBottom: '1px solid rgba(167,139,250,0.24)', borderLeft: '1px solid rgba(167,139,250,0.24)' },
                { bottom: 18, right: 18, borderBottom: '1px solid rgba(167,139,250,0.24)', borderRight: '1px solid rgba(167,139,250,0.24)' },
            ].map((style, index) => (
                <span
                    key={index}
                    style={{
                        position: 'absolute',
                        width: 38,
                        height: 38,
                        ...style,
                    }}
                />
            ))}
        </div>
    )
}
