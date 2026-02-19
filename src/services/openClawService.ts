import { useSoulStore } from '../store/soulStore';

const OPENCLAW_API_BASE = import.meta.env.VITE_OPENCLAW_API_URL || 'http://localhost:8000';

export interface OpenClawResponse {
    text: string;
    mood?: string;
    intensity?: number;
}

export const openClawService = {
    async sendMessage(text: string): Promise<OpenClawResponse> {
        const store = useSoulStore.getState();
        
        store.setIsThinking(true);
        store.setMood('thinking');
        store.setIntensity(1.2);

        try {
            const response = await fetch(`${OPENCLAW_API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: text }),
            });

            if (!response.ok) {
                throw new Error('Failed to connect to OpenClaw');
            }

            const data = await response.json();
            
            // Expected OpenClaw response format or mapping
            const result: OpenClawResponse = {
                text: data.reply || data.text || "No response received",
                mood: data.metadata?.mood || 'calm',
                intensity: data.metadata?.intensity || 0.5
            };

            return result;
        } catch (error) {
            console.error('OpenClaw Service Error:', error);
            return {
                text: "Lo siento, hubo un error al conectar con mi cerebro (OpenClaw).",
                mood: 'calm',
                intensity: 0.3
            };
        } finally {
            store.setIsThinking(false);
        }
    }
};
