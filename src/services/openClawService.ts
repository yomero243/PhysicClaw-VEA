import { useSoulStore } from '../store/soulStore';

export interface OpenClawResponse {
    text: string;
    mood?: string;
    intensity?: number;
}

/**
 * Conversation history for the current session.
 * Stored at module level so it persists across React re-renders.
 * Call clearHistory() on user sign-out to prevent context leaking between
 * different user sessions.
 */
const conversationHistory: Array<{ role: string; content: string }> = [];

export const openClawService = {
    async sendMessage(text: string): Promise<OpenClawResponse> {
        const store = useSoulStore.getState();

        store.setIsThinking(true);
        store.setMood('thinking');
        store.setIntensity(1.2);

        conversationHistory.push({ role: 'user', content: text });

        try {
            const baseUrl = store.apiBaseUrl.trim().replace(/\/$/, '')

            // When apiBaseUrl is empty, use a relative path so the Vite dev-server
            // proxy (or any reverse proxy in production) can forward the request to
            // the local OpenClaw / LLM API. When a custom URL is set, the request
            // goes directly to that origin — ensure that server allows CORS from
            // your frontend origin, or configure a proxy in vite.config.ts.
            const endpoint = baseUrl
                ? `${baseUrl}/v1/chat/completions`
                : '/v1/chat/completions'

            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (store.apiToken) {
                headers['Authorization'] = `Bearer ${store.apiToken}`
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: store.apiModel,
                    messages: conversationHistory,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenClaw API responded with HTTP ${response.status}`);
            }

            const data = await response.json();
            const replyText: string = data.choices?.[0]?.message?.content ?? 'Sin respuesta';

            conversationHistory.push({ role: 'assistant', content: replyText });

            return {
                text: replyText,
                mood: 'calm',
                intensity: 0.5,
            };
        } catch (err) {
            // Remove the failed user message so the model context stays consistent
            conversationHistory.pop();
            console.error('[OpenClawService] sendMessage failed:', err);
            return {
                text: 'Lo siento, hubo un error al conectar con OpenClaw.',
                mood: 'calm',
                intensity: 0.3,
            };
        } finally {
            store.setIsThinking(false);
        }
    },

    /**
     * Clear in-memory conversation history.
     * Must be called on user sign-out to prevent history leaking between
     * different user sessions within the same browser tab.
     */
    clearHistory() {
        conversationHistory.length = 0;
    },

    /**
     * Returns a read-only copy of the current conversation history.
     * Useful for debugging or displaying the full chat log.
     */
    getHistory(): ReadonlyArray<{ role: string; content: string }> {
        return [...conversationHistory];
    },
};
