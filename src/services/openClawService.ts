import { useSoulStore } from '../store/soulStore';

const OPENCLAW_API_BASE = import.meta.env.VITE_OPENCLAW_API_URL || 'http://127.0.0.1:18789';
const OPENCLAW_TOKEN = import.meta.env.VITE_OPENCLAW_TOKEN || '';
const OPENCLAW_MODEL = import.meta.env.VITE_OPENCLAW_MODEL || 'google/gemini-2.5-flash';

export interface OpenClawResponse {
    text: string;
    mood?: string;
    intensity?: number;
}

// Conversation history for context
const conversationHistory: Array<{ role: string; content: string }> = [];

export const openClawService = {
    async sendMessage(text: string): Promise<OpenClawResponse> {
        const store = useSoulStore.getState();

        store.setIsThinking(true);
        store.setMood('thinking');
        store.setIntensity(1.2);

        conversationHistory.push({ role: 'user', content: text });

        try {
            const response = await fetch(`${OPENCLAW_API_BASE}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
                },
                body: JSON.stringify({
                    model: OPENCLAW_MODEL,
                    messages: conversationHistory,
                    stream: false,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenClaw error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const replyText: string = data.choices?.[0]?.message?.content ?? 'Sin respuesta';

            conversationHistory.push({ role: 'assistant', content: replyText });

            return {
                text: replyText,
                mood: 'calm',
                intensity: 0.5,
            };
        } catch (error) {
            console.error('OpenClaw Service Error:', error);
            conversationHistory.pop(); // remove failed user message
            return {
                text: 'Lo siento, hubo un error al conectar con OpenClaw.',
                mood: 'calm',
                intensity: 0.3,
            };
        } finally {
            store.setIsThinking(false);
        }
    },

    clearHistory() {
        conversationHistory.length = 0;
    },
};
