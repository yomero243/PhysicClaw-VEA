import { useSoulStore } from '../store/soulStore';

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
            const baseUrl = store.apiBaseUrl.replace(/\/$/, '')
            const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${store.apiToken}`,
                },
                body: JSON.stringify({
                    model: store.apiModel,
                    messages: conversationHistory,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenClaw error ${response.status}`);
            }

            const data = await response.json();
            const replyText: string = data.choices?.[0]?.message?.content ?? 'Sin respuesta';

            conversationHistory.push({ role: 'assistant', content: replyText });

            return {
                text: replyText,
                mood: 'calm',
                intensity: 0.5,
            };
        } catch {
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
