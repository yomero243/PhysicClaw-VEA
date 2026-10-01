import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock soulStore BEFORE importing the service ---
const mockStore = {
    apiBaseUrl: '',
    apiModel: 'test-model',
    apiToken: 'test-token',
    isThinking: false,
    setIsThinking: vi.fn(),
    setMood: vi.fn(),
    setIntensity: vi.fn(),
    addChatMessage: vi.fn(),
    clearChatMessages: vi.fn(),
}

vi.mock('../../store/soulStore', () => ({
    useSoulStore: {
        getState: () => mockStore,
    },
}))

import { openClawService } from '../openClawService'

// Helper: build a minimal OpenAI-compatible response body
function makeApiResponse(content: string) {
    return {
        choices: [{ message: { content } }],
    }
}

describe('openClawService', () => {
    beforeEach(() => {
        openClawService.clearHistory()
        vi.clearAllMocks()
    })

    describe('clearHistory()', () => {
        it('empties the conversation history', async () => {
            // Stub fetch so sendMessage succeeds and adds to history
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse(JSON.stringify({ text: 'hola', mood: 'calm', intensity: 0.5 })),
            }))

            await openClawService.sendMessage('hello')
            expect(openClawService.getHistory()).toHaveLength(2) // user + assistant

            openClawService.clearHistory()
            expect(openClawService.getHistory()).toHaveLength(0)
        })

        it('calls clearChatMessages on the store', () => {
            openClawService.clearHistory()
            expect(mockStore.clearChatMessages).toHaveBeenCalledOnce()
        })
    })

    describe('getHistory()', () => {
        it('returns an empty array initially', () => {
            expect(openClawService.getHistory()).toEqual([])
        })

        it('returns a read-only copy (mutations do not affect internal state)', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse(JSON.stringify({ text: 'hi', mood: 'happy', intensity: 0.7 })),
            }))

            await openClawService.sendMessage('test')
            const history = openClawService.getHistory() as Array<{ role: string; content: string }>
            history.push({ role: 'user', content: 'injected' })
            expect(openClawService.getHistory()).not.toContainEqual({ role: 'user', content: 'injected' })
        })
    })

    describe('sendMessage()', () => {
        it('calls setIsThinking(true) then setIsThinking(false)', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse(JSON.stringify({ text: 'ok', mood: 'calm', intensity: 0.5 })),
            }))

            await openClawService.sendMessage('hola')
            expect(mockStore.setIsThinking).toHaveBeenCalledWith(true)
            expect(mockStore.setIsThinking).toHaveBeenCalledWith(false)
        })

        it('returns parsed mood and intensity from JSON response', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse(
                    JSON.stringify({ text: 'me alegra!', mood: 'happy', intensity: 0.8 })
                ),
            }))

            const result = await openClawService.sendMessage('buenas noticias')
            expect(result.mood).toBe('happy')
            expect(result.intensity).toBe(0.8)
            expect(result.text).toBe('me alegra!')
        })

        it('handles JSON wrapped in markdown code block', async () => {
            const wrapped = '```json\n{"text":"cool","mood":"excited","intensity":1.1}\n```'
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse(wrapped),
            }))

            const result = await openClawService.sendMessage('awesome')
            expect(result.mood).toBe('excited')
            expect(result.intensity).toBe(1.1)
        })

        it('returns safe defaults when response is not valid JSON', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse('plain text response'),
            }))

            const result = await openClawService.sendMessage('test')
            expect(result.text).toBe('plain text response')
            expect(result.mood).toBe('calm')
            expect(result.intensity).toBe(0.5)
        })

        it('returns error response on HTTP failure and removes user message from history', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            }))

            const result = await openClawService.sendMessage('will fail')
            expect(result.mood).toBe('sad')
            // Failed user message must not remain in history
            expect(openClawService.getHistory()).toHaveLength(0)
        })

        it('returns error response on network failure', async () => {
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

            const result = await openClawService.sendMessage('no network')
            expect(result.mood).toBe('sad')
            expect(mockStore.setIsThinking).toHaveBeenCalledWith(false)
        })

        it('adds user and assistant messages to history on success', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse(JSON.stringify({ text: 'reply', mood: 'calm', intensity: 0.5 })),
            }))

            await openClawService.sendMessage('hello')
            const history = openClawService.getHistory()
            expect(history[0]).toEqual({ role: 'user', content: 'hello' })
            expect(history[1].role).toBe('assistant')
        })

        it('sends Authorization header only when apiToken is set', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse(JSON.stringify({ text: 'ok', mood: 'calm', intensity: 0.5 })),
            })
            vi.stubGlobal('fetch', fetchMock)

            await openClawService.sendMessage('auth test')
            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
            const headers = init.headers as Record<string, string>
            expect(headers['Authorization']).toBe('Bearer test-token')
        })

        it('omits Authorization header when apiToken is empty', async () => {
            mockStore.apiToken = ''
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => makeApiResponse(JSON.stringify({ text: 'ok', mood: 'calm', intensity: 0.5 })),
            })
            vi.stubGlobal('fetch', fetchMock)

            await openClawService.sendMessage('no token')
            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
            const headers = init.headers as Record<string, string>
            expect(headers['Authorization']).toBeUndefined()

            // restore
            mockStore.apiToken = 'test-token'
        })
    })
})
