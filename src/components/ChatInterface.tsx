import { useState, useEffect } from 'react'
import { useSoulStore } from '../store/soulStore'
import { openClawService } from '../services/openClawService'

// Polyfill for SpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export const ChatInterface = () => {
    const [inputText, setInputText] = useState('')
    const [isListening, setIsListening] = useState(false)
    const [recognition, setRecognition] = useState<any>(null)
    const [isOpen, setIsOpen] = useState(false)

    const {
        lastMessage, setLastMessage,
        isThinking,
        setMood, setIntensity,
    } = useSoulStore()

    useEffect(() => {
        if (SpeechRecognition) {
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

            recog.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                handleSendMessage(transcript)
            }

            setRecognition(recog)
        }
    }, [])

    const toggleListening = () => {
        if (recognition) {
            if (isListening) recognition.stop()
            else recognition.start()
        } else {
            alert('Speech Recognition not supported in this browser.')
        }
    }

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return

        setLastMessage(text)
        setInputText('')

        const response = await openClawService.sendMessage(text);

        setMood(response.mood || 'calm');
        setIntensity(response.intensity || 0.5);
        speakResponse(response.text);
    }

    const speakResponse = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'es-ES'
        window.speechSynthesis.speak(utterance)
    }

    return (
        <>
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        right: '20px',
                        zIndex: 10,
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'linear-gradient(135deg, #007bff, #00ccff)',
                        color: 'white',
                        fontSize: '20px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0, 123, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s',
                    }}
                    title="Open Chat"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                </button>
            )}

            {/* Floating Chat Panel */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                zIndex: 10,
                width: '380px',
                maxHeight: '500px',
                background: 'rgba(20, 20, 30, 0.92)',
                backdropFilter: 'blur(12px)',
                padding: isOpen ? '16px' : '0',
                borderRadius: '16px',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'system-ui, sans-serif',
                transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                transition: 'transform 0.25s ease, opacity 0.25s ease',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Chat</span>
                    <button
                        onClick={() => setIsOpen(false)}
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

                {/* Status */}
                <div style={{
                    minHeight: '20px',
                    fontSize: '13px',
                    color: isThinking ? '#00ffff' : isListening ? '#ff4d4d' : '#aaaaaa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {isThinking ? (
                        <>
                            <span className="animate-pulse">●</span> Procesando...
                        </>
                    ) : isListening ? (
                        <>
                            <span style={{ color: '#ff4d4d' }}>●</span> Escuchando...
                        </>
                    ) : (
                        <span>Esperando input...</span>
                    )}
                </div>

                {lastMessage && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        maxHeight: '120px',
                        overflowY: 'auto',
                    }}>
                        <strong style={{ opacity: 0.6 }}>Tu:</strong> {lastMessage}
                    </div>
                )}

                {/* Input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                        placeholder="Escribe un mensaje..."
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'white',
                            outline: 'none',
                            fontSize: '13px',
                        }}
                    />
                    <button
                        onClick={() => handleSendMessage(inputText)}
                        style={{
                            padding: '0 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(45deg, #007bff, #00ccff)',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Enviar
                    </button>
                    <button
                        onClick={toggleListening}
                        title={isListening ? "Detener escucha" : "Activar microfono"}
                        style={{
                            padding: '10px',
                            borderRadius: '50%',
                            border: 'none',
                            background: isListening ? '#ff4d4d' : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: 'pointer',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.3s',
                            flexShrink: 0,
                        }}
                    >
                        {isListening ? '⬛' : '🎤'}
                    </button>
                </div>
            </div>
        </>
    )
}
