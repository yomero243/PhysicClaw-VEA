import { useState, useEffect, useRef } from 'react'
import { useSoulStore, MOOD_COLORS } from '../store/soulStore'
import { openClawService } from '../services/openClawService'

// Polyfill for SpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export const ChatInterface = () => {
    const [inputText, setInputText] = useState('')
    const [isListening, setIsListening] = useState(false)
    const [recognition, setRecognition] = useState<any>(null)
    const [isOpen, setIsOpen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const {
        isThinking, mood,
        setMood, setIntensity,
        chatMessages,
    } = useSoulStore()

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    useEffect(() => {
        if (SpeechRecognition) {
            const recog = new SpeechRecognition()
            recog.continuous = false
            recog.lang = 'en-US'
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

    const MAX_MESSAGE_LENGTH = 4000

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return
        if (text.length > MAX_MESSAGE_LENGTH) return
        setInputText('')

        const response = await openClawService.sendMessage(text)
        speakResponse(response.text)
    }

    const speakResponse = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        window.speechSynthesis.speak(utterance)
    }

    const moodColor = MOOD_COLORS[mood] || '#aaaaaa'

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
                    {/* Unread indicator */}
                    {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant' && (
                        <div style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: moodColor,
                            border: '2px solid #111',
                        }} />
                    )}
                </button>
            )}

            {/* Floating Chat Panel */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: `translateX(-50%) ${isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)'}`,
                zIndex: 10,
                width: '100%',
                maxWidth: '600px',
                maxHeight: '500px',
                background: 'rgba(20, 20, 30, 0.92)',
                backdropFilter: 'blur(12px)',
                padding: isOpen ? '16px' : '0',
                borderRadius: '16px',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'system-ui, sans-serif',
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                transition: 'transform 0.25s ease, opacity 0.25s ease',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
                {/* Header with mood indicator */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '8px',
                    marginBottom: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: moodColor,
                            boxShadow: `0 0 8px ${moodColor}`,
                            transition: 'background 0.5s, box-shadow 0.5s',
                        }} />
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>Chat</span>
                        <span style={{
                            fontSize: '10px',
                            color: moodColor,
                            textTransform: 'capitalize',
                            transition: 'color 0.5s',
                        }}>
                            {mood}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={() => openClawService.clearHistory()}
                            title="Clear chat"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '2px 6px',
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                        </button>
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
                </div>

                {/* Messages Area */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '340px',
                    minHeight: '120px',
                    paddingRight: '4px',
                    marginBottom: '10px',
                }}>
                    {chatMessages.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            color: 'rgba(255,255,255,0.25)',
                            fontSize: '12px',
                            padding: '30px 10px',
                        }}>
                            Start a conversation...
                        </div>
                    )}

                    {chatMessages.map((msg, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            }}
                        >
                            <div style={{
                                maxWidth: '85%',
                                padding: '10px 12px',
                                borderRadius: msg.role === 'user'
                                    ? '12px 12px 2px 12px'
                                    : '12px 12px 12px 2px',
                                background: msg.role === 'user'
                                    ? 'rgba(0, 123, 255, 0.25)'
                                    : 'rgba(255, 255, 255, 0.08)',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                borderLeft: msg.role === 'assistant' && msg.mood
                                    ? `3px solid ${MOOD_COLORS[msg.mood] || '#aaaaaa'}`
                                    : undefined,
                            }}>
                                {msg.content}
                            </div>
                            {msg.role === 'assistant' && msg.mood && (
                                <span style={{
                                    fontSize: '9px',
                                    color: MOOD_COLORS[msg.mood] || '#aaaaaa',
                                    textTransform: 'capitalize',
                                    marginTop: '2px',
                                    marginLeft: '4px',
                                    opacity: 0.7,
                                }}>
                                    {msg.mood}
                                </span>
                            )}
                        </div>
                    ))}

                    {/* Thinking indicator */}
                    {isThinking && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                        }}>
                            <div style={{
                                padding: '10px 16px',
                                borderRadius: '12px 12px 12px 2px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                fontSize: '13px',
                                color: '#00ffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}>
                                <span className="animate-pulse">●</span>
                                <span className="animate-pulse">●</span>
                                <span className="animate-pulse">●</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Status bar */}
                {isListening && (
                    <div style={{
                        fontSize: '11px',
                        color: '#ff4d4d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px',
                    }}>
                        <span style={{ color: '#ff4d4d' }}>●</span> Listening...
                    </div>
                )}

                {/* Input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                        placeholder="Type a message..."
                        maxLength={MAX_MESSAGE_LENGTH}
                        disabled={isThinking}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'white',
                            outline: 'none',
                            fontSize: '13px',
                            opacity: isThinking ? 0.5 : 1,
                        }}
                    />
                    <button
                        onClick={() => handleSendMessage(inputText)}
                        disabled={isThinking}
                        style={{
                            padding: '0 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isThinking
                                ? 'rgba(255,255,255,0.1)'
                                : 'linear-gradient(45deg, #007bff, #00ccff)',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: isThinking ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Send
                    </button>
                    <button
                        onClick={toggleListening}
                        title={isListening ? "Stop listening" : "Start microphone"}
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
