import { useState, useEffect, useRef, useCallback } from 'react'
import { useSoulStore } from '../store/soulStore'
import { useAuth } from '../auth/AuthProvider'
import { CHARACTERS } from '../constants/characters'

// Polyfill for SpeechRecognition
const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

/**
 * ChatInterface
 *
 * Improvements over the original:
 * - Uses the authenticated user name from AuthProvider / soulStore
 * - Persists chat history via soulStore.addMessage
 * - Displays full conversation history with user/assistant bubbles
 * - Fixes stale closure in SpeechRecognition.onresult by forwarding
 *   the latest handleSendMessage via a ref
 * - Separates recognition setup (once) from the callback (dynamic)
 */
export const ChatInterface = () => {
    const [inputText, setInputText] = useState('')
    const [isListening, setIsListening] = useState(false)
    const recognitionRef = useRef<any>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Use a ref to always have the latest sendMessage callback inside
    // the SpeechRecognition handler without re-creating the recognizer.
    const sendRef = useRef<(text: string) => void>(() => {})

    const {
        lastMessage, setLastMessage,
        isThinking, setIsThinking,
        setMood, setIntensity,
        activeCharacterId, setActiveCharacterId,
        messages, addMessage,
        user,
    } = useSoulStore()

    const { logout } = useAuth()

    // ----------------------------------------------------------------
    // Send message handler (memoized, captured via ref for recognition)
    // ----------------------------------------------------------------
    const handleSendMessage = useCallback(
        (text: string) => {
            if (!text.trim()) return

            const trimmed = text.trim()

            // Record user message in history
            addMessage({ role: 'user', text: trimmed })
            setLastMessage(trimmed)
            setIsThinking(true)
            setMood('thinking')
            setIntensity(1.0)
            setInputText('')

            // Simple keyword sentiment
            const isHappy = /hola|feliz|bien|alegre|genial/i.test(trimmed)
            const isSad = /triste|mal|solo|problema/i.test(trimmed)

            setTimeout(() => {
                setIsThinking(false)
                const newMood = isHappy ? 'excited' : isSad ? 'calm' : 'calm'
                setMood(newMood)
                setIntensity(isHappy ? 1.5 : 0.5)

                const response = `Entendido, he recibido tu mensaje: "${trimmed}"`
                addMessage({ role: 'assistant', text: response })
                speakResponse(response)
            }, 2000)
        },
        [addMessage, setLastMessage, setIsThinking, setMood, setIntensity]
    )

    // Keep ref in sync so recognition handler always calls latest version
    useEffect(() => {
        sendRef.current = handleSendMessage
    }, [handleSendMessage])

    // ----------------------------------------------------------------
    // SpeechRecognition setup — runs once on mount
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!SpeechRecognition) return

        const recog = new SpeechRecognition()
        recog.continuous = false
        recog.lang = 'es-ES'
        recog.interimResults = false

        recog.onstart = () => {
            setIsListening(true)
            setMood('listening')
            setIntensity(0.8)
        }
        recog.onend = () => {
            setIsListening(false)
            setMood('calm')
            setIntensity(0.5)
        }

        // Use ref to avoid stale closure
        recog.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript
            sendRef.current(transcript)
        }

        recognitionRef.current = recog

        return () => {
            try { recog.abort() } catch (_) {}
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------
    const toggleListening = () => {
        const recog = recognitionRef.current
        if (!recog) {
            alert('Speech Recognition no está soportado en este navegador.')
            return
        }
        if (isListening) recog.stop()
        else recog.start()
    }

    const speakResponse = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'es-ES'
        window.speechSynthesis.speak(utterance)
    }

    // ----------------------------------------------------------------
    // Render
    // ----------------------------------------------------------------
    return (
        <div
            style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                width: '90%',
                maxWidth: '640px',
                background: 'rgba(14, 14, 24, 0.88)',
                backdropFilter: 'blur(12px)',
                padding: '20px',
                borderRadius: '18px',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            {/* Character + user header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                }}
            >
                {/* Character selector */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {CHARACTERS.map((char) => (
                        <button
                            key={char.id}
                            onClick={() => setActiveCharacterId(char.id)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: 'none',
                                background:
                                    activeCharacterId === char.id
                                        ? '#007bff'
                                        : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            {char.name}
                        </button>
                    ))}
                </div>

                {/* Logged-in user badge */}
                {user && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#00ccff',
                        }}
                    >
                        <span>👤</span>
                        <span style={{ fontWeight: 700 }}>{user}</span>
                        <button
                            onClick={logout}
                            title="Cerrar sesión"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#555',
                                cursor: 'pointer',
                                fontSize: '14px',
                                lineHeight: 1,
                                padding: '0 2px',
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>

            {/* Status indicator */}
            <div
                style={{
                    minHeight: '22px',
                    fontSize: '13px',
                    color: isThinking ? '#ab47bc' : isListening ? '#ff4d4d' : '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
            >
                {isThinking ? (
                    <>
                        <span style={{ animation: 'pulse 1s infinite' }}>●</span>
                        Procesando...
                    </>
                ) : isListening ? (
                    <>
                        <span style={{ color: '#ff4d4d' }}>●</span>
                        Escuchando...
                    </>
                ) : (
                    <span>Esperando input…</span>
                )}
            </div>

            {/* Chat history */}
            {messages.length > 0 && (
                <div
                    style={{
                        maxHeight: '220px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingRight: '4px',
                    }}
                >
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems:
                                    msg.role === 'user' ? 'flex-end' : 'flex-start',
                            }}
                        >
                            <div
                                style={{
                                    maxWidth: '85%',
                                    padding: '10px 14px',
                                    borderRadius:
                                        msg.role === 'user'
                                            ? '16px 16px 4px 16px'
                                            : '16px 16px 16px 4px',
                                    background:
                                        msg.role === 'user'
                                            ? 'linear-gradient(135deg, #007bff33, #00ccff33)'
                                            : 'rgba(255,255,255,0.07)',
                                    border:
                                        msg.role === 'user'
                                            ? '1px solid #007bff44'
                                            : '1px solid rgba(255,255,255,0.08)',
                                    fontSize: '14px',
                                    lineHeight: 1.5,
                                }}
                            >
                                {msg.text}
                            </div>
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: '#444',
                                    marginTop: '3px',
                                    paddingInline: '4px',
                                }}
                            >
                                {msg.role === 'user' ? (user ?? 'Tú') : 'VEA'} ·{' '}
                                {new Date(msg.timestamp).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}

            {/* Last message fallback if no history */}
            {messages.length === 0 && lastMessage && (
                <div
                    style={{
                        background: 'rgba(255,255,255,0.07)',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                    }}
                >
                    <strong style={{ opacity: 0.6 }}>Tú:</strong> {lastMessage}
                </div>
            )}

            {/* Input row */}
            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                    placeholder="Escribe un mensaje..."
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(0,0,0,0.3)',
                        color: 'white',
                        outline: 'none',
                        fontSize: '14px',
                    }}
                />
                <button
                    onClick={() => handleSendMessage(inputText)}
                    style={{
                        padding: '0 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(45deg, #007bff, #00ccff)',
                        color: 'white',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                    }}
                >
                    Enviar
                </button>
                <button
                    onClick={toggleListening}
                    title={isListening ? 'Detener escucha' : 'Activar micrófono'}
                    style={{
                        padding: '12px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isListening
                            ? '#ff4d4d'
                            : 'rgba(255,255,255,0.1)',
                        color: 'white',
                        cursor: 'pointer',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                        transition: 'background 0.3s',
                    }}
                >
                    {isListening ? '⬛' : '🎤'}
                </button>
            </div>
        </div>
    )
}
