import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { useSoulStore } from '../store/soulStore'
import { openClawService } from '../services/openClawService'
import { CHARACTERS } from '../constants/characters'
import type { MessageRole, MoodType } from '../types/database'

// Polyfill for SpeechRecognition
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

// ─── Types ────────────────────────────────────────────────────────
interface ChatMsg {
  id: string
  role: MessageRole
  text: string
  timestamp: string | number
}

// ─── Sub-components ───────────────────────────────────────────────

const MoodDot = memo(function MoodDot({ mood, isThinking, isListening }: { mood: string; isThinking: boolean; isListening: boolean }) {
  const color = isThinking ? '#b060ff' : isListening ? '#FF7A5C' : '#8CFFB0'
  const label = isThinking ? 'PROCESSING' : isListening ? 'LISTENING' : mood.toUpperCase()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        animation: (isThinking || isListening) ? 'vea-pulse 1s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 10, letterSpacing: 2, color, fontFamily: '"Courier New", monospace' }}>
        {label}
      </span>
    </div>
  )
})

const CharacterTabs = memo(function CharacterTabs({
  characters,
  activeId,
  onSelect,
}: {
  characters: typeof CHARACTERS
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {characters.map((char) => {
        const active = activeId === char.id
        return (
          <button
            key={char.id}
            onClick={() => onSelect(char.id)}
            style={{
              padding: '4px 12px',
              borderRadius: 2,
              border: `1px solid ${active ? '#8CFFB0' : 'rgba(140,255,176,0.2)'}`,
              background: active ? 'rgba(140,255,176,0.12)' : 'transparent',
              color: active ? '#8CFFB0' : '#A9B89A',
              fontSize: 10,
              fontFamily: '"Courier New", monospace',
              letterSpacing: 1,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: active ? '0 0 8px rgba(140,255,176,0.2)' : 'none',
            }}
          >
            {char.name.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
})

const MessageBubble = memo(function MessageBubble({ msg, userName }: { msg: ChatMsg; userName: string | null }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '9px 14px',
        background: isUser
          ? 'linear-gradient(135deg, rgba(140,255,176,0.12), rgba(93,122,65,0.08))'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isUser ? 'rgba(140,255,176,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: isUser ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
        fontSize: 13,
        lineHeight: 1.6,
        color: isUser ? '#EAF3DF' : '#A9B89A',
        fontFamily: '"Courier New", monospace',
        position: 'relative',
      }}>
        {/* sender tag */}
        <div style={{
          fontSize: 9,
          letterSpacing: 2,
          color: isUser ? 'rgba(140,255,176,0.5)' : 'rgba(169,184,154,0.4)',
          marginBottom: 4,
        }}>
          {isUser ? (userName ?? 'USER') : 'VEA'}
        </div>
        {msg.text}
      </div>
      <div style={{
        fontSize: 9, color: '#5B644D',
        marginTop: 3, paddingInline: 4,
        fontFamily: '"Courier New", monospace',
        letterSpacing: 1,
      }}>
        {new Date(msg.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
})

const ThinkingBubble = memo(function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div style={{
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px 8px 8px 2px',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#8CFFB0',
            display: 'inline-block',
            animation: `vea-blink 1.2s ease-in-out ${i * 0.2}s infinite`,
            opacity: 0.4,
          }} />
        ))}
      </div>
    </div>
  )
})

const SendButton = memo(function SendButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0 20px',
        height: 44,
        borderRadius: 4,
        border: `1px solid ${disabled ? 'rgba(140,255,176,0.15)' : '#8CFFB0'}`,
        background: disabled ? 'transparent' : 'linear-gradient(135deg, rgba(140,255,176,0.15), rgba(140,255,176,0.05))',
        color: disabled ? '#5B644D' : '#8CFFB0',
        fontFamily: '"Courier New", monospace',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 2,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        boxShadow: disabled ? 'none' : '0 0 10px rgba(140,255,176,0.15)',
        flexShrink: 0,
      }}
    >
      SEND
    </button>
  )
})

const MicButton = memo(function MicButton({ isListening, onClick }: { isListening: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={isListening ? 'Stop' : 'Voice input'}
      style={{
        width: 44, height: 44, borderRadius: 4, border: 'none', flexShrink: 0,
        background: isListening ? 'rgba(255,122,92,0.2)' : 'rgba(255,255,255,0.04)',
        color: isListening ? '#FF7A5C' : '#A9B89A',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, transition: 'all 0.15s',
        boxShadow: isListening ? '0 0 12px rgba(255,122,92,0.3)' : 'none',
      }}
    >
      {isListening ? '⬛' : '🎙'}
    </button>
  )
})

// ─── Main Component ───────────────────────────────────────────────
export const ChatInterface = () => {
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendRef = useRef<(text: string) => void>(() => {})
  const inputRef = useRef<HTMLInputElement>(null)

  // Selective store subscriptions to avoid unnecessary re-renders
  const lastMessage = useSoulStore(s => s.lastMessage)
  const setLastMessage = useSoulStore(s => s.setLastMessage)
  const isThinking = useSoulStore(s => s.isThinking)
  const mood = useSoulStore(s => s.mood)
  const setMood = useSoulStore(s => s.setMood)
  const setIntensity = useSoulStore(s => s.setIntensity)
  const activeCharacterId = useSoulStore(s => s.activeCharacterId)
  const setActiveCharacterId = useSoulStore(s => s.setActiveCharacterId)
  const userName = useSoulStore(s => s.userName)
  
  // Scene store for persistent messages
  const messages = useSceneStore(s => s.messages)
  const saveMessage = useSceneStore(s => s.saveMessage)

  // ── Helpers ─────────────────────────────────────────────────────
  const speakResponse = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = 1.0
    utterance.pitch = 1.1
    window.speechSynthesis.speak(utterance)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      try {
        recognitionRef.current?.start()
      } catch (e) {
        console.error('Speech recognition error:', e)
      }
    }
  }, [isListening])

  // ── Send handler ────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return
    const trimmed = text.trim()
    
    // Optimistic UI + Persistence
    await saveMessage(trimmed, 'user')
    
    setLastMessage(trimmed)
    setMood('thinking')
    setIntensity(1.0)
    setInputText('')

    const result = await openClawService.sendMessage(trimmed)
    
    // Persistent assistant response
    await saveMessage(result.text, 'assistant', result.mood as MoodType, result.intensity)
    
    setMood((result.mood ?? 'calm') as MoodType)
    setIntensity(result.intensity ?? 0.5)
    speakResponse(result.text)
  }, [saveMessage, setLastMessage, setMood, setIntensity, isThinking, speakResponse])

  useEffect(function syncSendRef() { sendRef.current = handleSend }, [handleSend])

  useEffect(function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isThinking])

  // ── Speech recognition ─────────────────────────────────────────
  useEffect(function setupSpeechRecognition() {
    if (!SpeechRecognition) return
    const recog = new SpeechRecognition()
    recog.continuous = false
    recog.lang = 'es-ES'
    recog.interimResults = false
    recog.onstart = () => { setIsListening(true); setMood('listening'); setIntensity(0.8) }
    recog.onend = () => { setIsListening(false); setMood('calm'); setIntensity(0.5) }
    recog.onresult = (e: any) => sendRef.current(e.results[0][0].transcript)
    recognitionRef.current = recog
    return function cleanupSpeechRecognition() {
      try {
        recog.abort()
      } catch (_) {
        return
      }
    }
  }, [setMood, setIntensity]) 

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes vea-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes vea-blink {
          0%, 80%, 100% { opacity: 0.2; transform: scaleY(0.6); }
          40% { opacity: 1; transform: scaleY(1); }
        }
        .vea-input::placeholder { color: rgba(140,255,176,0.25); }
        .vea-input:focus { border-color: rgba(140,255,176,0.5) !important; box-shadow: 0 0 12px rgba(140,255,176,0.12); }
        .vea-scrollbar::-webkit-scrollbar { width: 3px; }
        .vea-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .vea-scrollbar::-webkit-scrollbar-thumb { background: rgba(140,255,176,0.2); border-radius: 2px; }
      `}</style>

      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        width: '92%',
        maxWidth: 660,
        fontFamily: '"Courier New", monospace',
      }}>
        {/* ── Main panel ── */}
        <div style={{
          background: 'rgba(10,11,10,0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(140,255,176,0.18)',
          borderRadius: 6,
          boxShadow: '0 0 40px rgba(140,255,176,0.06), 0 16px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>

          {/* top accent */}
          <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(140,255,176,0.4), transparent)' }} />

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(140,255,176,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* VEA label */}
              <span style={{ fontSize: 11, letterSpacing: 3, color: '#8CFFB0', fontWeight: 700 }}>
                VEA<span style={{ color: 'rgba(140,255,176,0.3)' }}>::CHAT</span>
              </span>
              <MoodDot mood={mood} isThinking={isThinking} isListening={isListening} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* User badge - Guest mode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: 'rgba(140,255,176,0.5)', letterSpacing: 1 }}>
                  {userName?.toUpperCase() ?? 'GUEST'}
                </span>
              </div>

              {/* Connection indicator */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none',
                border: '1px solid rgba(140,255,176,0.15)',
                borderRadius: 3,
                padding: '3px 8px',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#C9F36A',
                  boxShadow: '0 0 5px #C9F36A',
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 9, letterSpacing: 1,
                  color: 'rgba(201,243,106,0.7)',
                  fontFamily: '"Courier New", monospace',
                }}>
                  CORE::ON
                </span>
              </div>

              {/* Collapse toggle */}
              <button
                onClick={() => setCollapsed(c => !c)}
                title={collapsed ? 'Expand' : 'Collapse'}
                style={{
                  background: 'none', border: 'none', color: '#5B644D',
                  cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '0 2px',
                  fontFamily: '"Courier New", monospace', letterSpacing: 1,
                }}
              >
                {collapsed ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {!collapsed && (
            <>
              {/* ── Character tabs ── */}
              <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid rgba(140,255,176,0.06)',
              }}>
                <CharacterTabs
                  characters={CHARACTERS}
                  activeId={activeCharacterId}
                  onSelect={setActiveCharacterId}
                />
              </div>

              {/* ── Message list ── */}
              {(messages.length > 0 || isThinking || (!isThinking && lastMessage && messages.length === 0)) && (
                <div
                  className="vea-scrollbar"
                  style={{
                    maxHeight: 220,
                    overflowY: 'auto',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    borderBottom: '1px solid rgba(140,255,176,0.06)',
                  }}
                >
                  {/* Fallback if no history */}
                  {messages.length === 0 && lastMessage && (
                    <MessageBubble
                      msg={{ id: 'legacy', role: 'user', text: lastMessage, timestamp: Date.now() }}
                      userName={userName}
                    />
                  )}

                  {messages.map(msg => (
                    <MessageBubble 
                      key={msg.id} 
                      msg={{ 
                        id: msg.id, 
                        role: msg.role, 
                        text: msg.content, 
                        timestamp: msg.created_at 
                      }} 
                      userName={userName} 
                    />
                  ))}

                  {isThinking && <ThinkingBubble />}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* ── Input row ── */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  {/* corner accents on input */}
                  <span style={{
                    position: 'absolute', top: -1, left: -1, width: 6, height: 6,
                    borderTop: '1px solid rgba(140,255,176,0.4)', borderLeft: '1px solid rgba(140,255,176,0.4)',
                    pointerEvents: 'none',
                  }} />
                  <span style={{
                    position: 'absolute', bottom: -1, right: -1, width: 6, height: 6,
                    borderBottom: '1px solid rgba(140,255,176,0.4)', borderRight: '1px solid rgba(140,255,176,0.4)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    ref={inputRef}
                    className="vea-input"
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(inputText)}
                    placeholder="SEND COMMAND..."
                    disabled={isThinking}
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 14px',
                      background: 'rgba(18,21,15,0.6)',
                      border: '1px solid rgba(140,255,176,0.15)',
                      borderRadius: 4,
                      color: '#EAF3DF',
                      fontSize: 13,
                      fontFamily: '"Courier New", monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      opacity: isThinking ? 0.5 : 1,
                    }}
                  />
                </div>

                <SendButton onClick={() => handleSend(inputText)} disabled={!inputText.trim() || isThinking} />
                <MicButton isListening={isListening} onClick={toggleListening} />
              </div>
            </>
          )}

          {/* bottom accent */}
          <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(140,255,176,0.12), transparent)' }} />
        </div>
      </div>
    </>
  )
}
