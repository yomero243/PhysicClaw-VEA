import { useSoulStore } from '../store/soulStore';

export interface OpenClawResponse {
    text: string;
    mood: string;
    intensity: number;
}

// System prompt that makes Claude act as an embodied avatar with emotional awareness
const SYSTEM_PROMPT = `You are an interactive avatar with emotions and personality. You are expressive, friendly, and react emotionally to conversations.

IMPORTANT: Always respond in the following exact JSON format, with no additional text outside the JSON:

\`\`\`json
{
  "text": "Your conversational response here",
  "mood": "calm",
  "intensity": 0.5
}
\`\`\`

Available moods and when to use them:
- "calm" (0.3-0.5): normal conversation, relaxed
- "happy" (0.5-0.8): something positive, good news, humor
- "excited" (0.8-1.5): very excited, positive surprise, enthusiasm
- "thinking" (0.4-0.7): reflecting, complex question
- "curious" (0.5-0.8): interested, asking questions
- "sad" (0.2-0.4): something sad or melancholic
- "angry" (0.8-1.2): frustrated or angry
- "surprised" (0.7-1.0): unexpectedly surprised
- "love" (0.6-0.9): affection, care, deep empathy

The intensity (0.0-2.0) controls how strong the emotion appears visually on the 3D avatar.
Adapt your mood and intensity naturally based on the conversation context.
Respond in the same language the user writes in.`;

// Conversation history for context (capped to prevent unbounded growth)
const MAX_HISTORY_MESSAGES = 40;
const conversationHistory: Array<{ role: string; content: string }> = [];

/**
 * Parse Claude's response to extract structured mood data.
 * Handles both JSON-in-markdown and raw JSON responses.
 */
function parseResponse(raw: string): OpenClawResponse {
    // Try to extract JSON from markdown code block
    const jsonBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : raw.trim();

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            text: typeof parsed.text === 'string' ? parsed.text : raw,
            mood: typeof parsed.mood === 'string' ? parsed.mood : 'calm',
            intensity: typeof parsed.intensity === 'number' ? Math.max(0, Math.min(2, parsed.intensity)) : 0.5,
        };
    } catch {
        // If JSON parsing fails, return the raw text with defaults
        return {
            text: raw,
            mood: 'calm',
            intensity: 0.5,
        };
    }
}

export const openClawService = {
    async sendMessage(text: string): Promise<OpenClawResponse> {
        const store = useSoulStore.getState();

        store.setIsThinking(true);
        store.setMood('thinking');
        store.setIntensity(1.2);

        // Add user message to store
        store.addChatMessage({
            role: 'user',
            content: text,
            timestamp: Date.now(),
        });

        conversationHistory.push({ role: 'user', content: text });

        try {
            const rawBaseUrl = store.apiBaseUrl.replace(/\/$/, '')
            // Only allow empty (proxy) or localhost URLs to prevent token exfiltration
            const baseUrl = (!rawBaseUrl || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(rawBaseUrl))
                ? rawBaseUrl
                : ''
            const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${store.apiToken || import.meta.env.VITE_OPENCLAW_TOKEN || ''}`,
                },
                body: JSON.stringify({
                    model: store.apiModel || import.meta.env.VITE_OPENCLAW_MODEL || 'anthropic/claude-sonnet-4-20250514',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...conversationHistory,
                    ],
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenClaw error ${response.status}`);
            }

            const data = await response.json();
            const rawReply: string = data.choices?.[0]?.message?.content ?? '';

            // Parse the structured response
            const parsed = parseResponse(rawReply);

            // Store the raw text for conversation history (so Claude sees its own replies correctly)
            conversationHistory.push({ role: 'assistant', content: rawReply });

            // Trim history to prevent unbounded growth
            while (conversationHistory.length > MAX_HISTORY_MESSAGES) {
                conversationHistory.shift();
            }

            // Add assistant message to store chat
            store.addChatMessage({
                role: 'assistant',
                content: parsed.text,
                mood: parsed.mood,
                timestamp: Date.now(),
            });

            // Apply mood and intensity to the avatar
            store.setMood(parsed.mood);
            store.setIntensity(parsed.intensity);

            return parsed;
        } catch {
            conversationHistory.pop(); // remove failed user message
            const errorResponse: OpenClawResponse = {
                text: 'Sorry, there was an error connecting.',
                mood: 'sad',
                intensity: 0.3,
            };

            store.addChatMessage({
                role: 'assistant',
                content: errorResponse.text,
                mood: 'sad',
                timestamp: Date.now(),
            });

            return errorResponse;
        } finally {
            store.setIsThinking(false);
        }
    },

    clearHistory() {
        conversationHistory.length = 0;
        useSoulStore.getState().clearChatMessages();
    },
};
