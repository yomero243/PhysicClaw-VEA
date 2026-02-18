import { useState, useEffect } from 'react'
import { useSoulStore } from '../store/soulStore'
import { CHARACTERS } from '../constants/characters'

// Polyfill for SpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export const ChatInterface = () => {
    const [inputText, setInputText] = useState('')
    const [isListening, setIsListening] = useState(false)
    const [recognition, setRecognition] = useState<any>(null)

    const { 
        lastMessage, setLastMessage, 
        isThinking, setIsThinking, 
        setMood, setIntensity,
        activeCharacterId, setActiveCharacterId 
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

    const handleSendMessage = (text: string) => {
        if (!text.trim()) return

        setLastMessage(text)
        setIsThinking(true)
        setMood('thinking')
        setIntensity(1.0)
        setInputText('')

        // Simple sentiment analysis simulation
        const isHappy = /hola|feliz|bien|alegre|genial/i.test(text)
        const isSad = /triste|mal|solo|problema/i.test(text)

        // Simulate response delay and TTS
        setTimeout(() => {
            setIsThinking(false)
            setMood(isHappy ? 'excited' : isSad ? 'calm' : 'calm')
            setIntensity(isHappy ? 1.5 : 0.5)
            speakResponse("Entendido, he recibido tu mensaje: " + text)
        }, 2000)
    }

    const speakResponse = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'es-ES'
        window.speechSynthesis.speak(utterance)
    }

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            width: '90%',
            maxWidth: '600px',
            background: 'rgba(20, 20, 30, 0.85)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '16px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontFamily: 'system-ui, sans-serif'
        }}>
            {/* Character Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '5px' }}>
                {CHARACTERS.map(char => (
                    <button
                        key={char.id}
                        onClick={() => setActiveCharacterId(char.id)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: 'none',
                            background: activeCharacterId === char.id ? '#007bff' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        {char.name}
                    </button>
                ))}
            </div>

            <div style={{
                marginBottom: '5px',
                minHeight: '24px',
                fontSize: '14px',
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
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '15px'
                }}>
                    <strong style={{ opacity: 0.7 }}>Tú:</strong> {lastMessage}
                </div>
            )}

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
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        color: 'white',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={() => handleSendMessage(inputText)}
                    style={{
                        padding: '0 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(45deg, #007bff, #00ccff)',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Enviar
                </button>
                <button
                    onClick={toggleListening}
                    title={isListening ? "Detener escucha" : "Activar micrófono"}
                    style={{
                        padding: '12px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isListening ? '#ff4d4d' : 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        cursor: 'pointer',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.3s'
                    }}
                >
                    {isListening ? '⬛' : '🎤'}
                </button>
            </div>
        </div>
    )
}
